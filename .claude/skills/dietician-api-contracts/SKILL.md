---
name: dietician-api-contracts
description: Backend contracts and data sources for dietician-mobile, covering which of the four APIs owns what, response envelopes, field-name mismatches, error conventions, and which features are mocked. Use before adding or changing anything in src/services, store data loading, API response handling, profile or preferences fields, fridge/ingredients, diet plans, meal logging, hydration, weight, or blood test data, and before showing health guidance to users.
---

# Dietician API contracts

The backend code is not in this repo. This file records what the client shows as of 2026-11-03. Confirm anything marked "verify" against the backend before depending on it.

## Services

| Env key | Paths | Client |
| --- | --- | --- |
| `EXPO_PUBLIC_ACCOUNT_API_URL` | `/auth`, `/profiles`, `/friends` | `authService`, `profileService`, `onboardingService`, `friendService` |
| `EXPO_PUBLIC_MEDICAL_API_URL` | `/uploads` | `bloodTestService` |
| `EXPO_PUBLIC_PROGRESS_API_URL` | `/progress`, `/daily-logs` | `progressService` |
| `EXPO_PUBLIC_PROGRESS_API_URL` | `/leaderboards`, `/scores` | `leaderboardService` |
| `EXPO_PUBLIC_RECOMMENDATION_API_URL` | `/foods`, `/diet-plans` | `recommendationService` |
| `EXPO_PUBLIC_RECOMMENDATION_API_URL` | `/diet-plans/shared` | `sharedPlanService` |
| `EXPO_PUBLIC_NOTIFICATION_API_URL` | `/notifications` | `notificationService` |

Use `fetchWithAuth` for authenticated calls, or `fetchData` when the response uses the `{ message, data }` envelope and failures should throw. `authService` uses raw `fetch` on purpose, because `apiClient` imports it for token refresh.

## Response shapes are not uniform

| Endpoint | Shape | Client behavior |
| --- | --- | --- |
| Most endpoints | `{ data: ... }` | Service unwraps `json.data` |
| `GET /foods` | `{ foods: [...] }` | No `data` wrapper. Fields are snake_case (`portion_size`), and `kcal`/`protein`/`carbs`/`fats` are per `portion_size` grams (100 for all foods), so scale them to the amount eaten (`foodToMealEntry`) |
| `/diet-plans*` | `{ message, data }` | Service returns raw JSON; **the store** unwraps `response?.data` |
| `POST /diet-plans/active/renew` | `{ message, data }` | Exception: uses `fetchData`, so the check-in can show the server's translated error |
| `GET /uploads` | `data` can be null | Falls back to `[]` |
| `GET /uploads/:id` | `{ data: { upload } }` | Unused: `GET /uploads` already carries `parsedResults`. The upload date is `createdAt` |
| `GET /profiles` | 404 means no profile yet | Normal for a first login; return `null` |
| `GET /diet-plans/active` | 404 means no plan | Return `null` |
| `GET /diet-plans/generation` | 404 means no generation in the last day | Return `null` |
| `GET /diet-plans/shared/offer` | 404 means no shared plan waiting | Return `null` |
| `GET /daily-logs/:date` | 404 means no log | Return `null` |

## Error handling differs by service

- `profileService`, `bloodTestService`, `recommendationService`, `leaderboardService`, and `friendService` throw.
- **Throw `ApiError` (`src/services/apiError.ts`), not `new Error('Failed to …')`.** Every service fails with `{ error, code, requestId }`, and `error` is already translated. Use `throw await ApiError.fromResponse(response, fallback)`, which carries `status` and `requestId`. The fallback is used only when the body has no message. In the popup, show `getErrorMessage(error, fallback)`: the server's message for an `ApiError`, and the fallback for anything else, such as a network failure. `profileService` and `fetchData` do this (from 2026-11-09). The other services still throw generic errors, so their popups show fixed text.
- **`progressService` catches everything** and returns `null`, `[]`, or `false`. Callers must check the return value, because `try/catch` around it never fires.

So anything that logs a meal must check the log first, then touch the plan:

- Plan meals go through `logPlanMeal` (`src/features/dietPlan/logPlanMeal.ts`); use it for any new place that marks a plan meal as eaten, as `HomeScreen` does.
- Extra meals: `ExtraMealForm` (`src/features/dietPlan/ExtraMealForm.tsx`) stops if `upsertDailyLog` returns null, before `addExtraMeal`. Fixed 2026-11-06; until then a failed log still added the meal.

## Field names change between read and write

Profile:

| App model | `GET`/`PUT /profiles` | `POST /profiles/onboarding` |
| --- | --- | --- |
| `name` | `displayName` | `name` |
| `goalType` | `goal` | `goalType` |

Preferences (`/profiles/preferences`):

| Field | Read | Write (`PUT`) |
| --- | --- | --- |
| Dietary | `preferences[].preference` | `preferences: string[]` |
| Disliked | `dislikedFoods[].foodName` | `dislikedFoods: string[]` |
| Allergies | `allergies[].allergy` | `allergies: { allergy }[]` |
| Fridge | `availableIngredients[].ingredient` | `availableIngredients: string[]` |

- `availableIngredients` can also arrive on `GET /profiles?include_fridge=true`, and that value wins.
- **Save only what changed.** `useProfileStore.updateDetails` sends just the fields given to `PUT /profiles`, never weight: weigh-ins set it on the server, and the app's copy is often older. `updatePreferences` sends just the lists given to `PUT /profiles/preferences`; the server keeps any list left out, and an empty list clears one. Sending a whole profile used to empty lists the app had loaded wrong, and to roll the weight back.
- `profileService.getProfile` throws if preferences can't be read, rather than returning empty lists that a later save would write back.
- `POST /profiles/onboarding` updates the existing profile, so restarting onboarding keeps one profile. Before, each run added a profile and its lists were left on the old one. Accounts from then can still have several rows; the newest is the one read. `OnboardingScreen` fills the draft's diet, disliked foods and allergies from the profile, because onboarding saves them again.
- **Onboarding can be undone.** `POST /profiles/onboarding` first keeps what it overwrites, and `DELETE /profiles/onboarding` puts that back once: the profile fields and the three lists, or no answers for a profile onboarding created. The app posts only when the user creates the plan (`saveAnswers`) and reverts only when that generation is cancelled (`revertAnswers`), so the server's snapshot is always that save's. Don't add another caller of `DELETE` without that pairing: the snapshot stays after a plan is created, and reverting later would bring back answers from before an old onboarding.
- Deploy account-service before an app that reverts. On an older server the `DELETE` fails, and `saveAnswers` then keeps failing, because it reverts an unreverted save first.
- The server must be updated before the app: an older account-service treats a list left out of `PUT /profiles/preferences` as empty and deletes it.
- **`targetWaterMl` and `targetCoffeeCups` are read-only.** The server sets them from weight and age (30 ml/kg within 1.5–3 L; 4 cups, or 1 under 18; see Pregnancy plan for its limits) and ignores them on writes, so never send them or add an input for them. They follow each weigh-in on the server, but the app's copy only updates when the profile reloads. `HomeScreen` passes them to `useHydrationStore.setTargets`.
- **Answers must agree, on both sides.** account-service returns a translated `400` for: more than one of `omnivore`, `vegetarian`, `vegan`, `pescatarian`; a `weight_loss` target at or above the current weight or below BMI 18.5 for the height; a preference listed twice; or a `gender`, `activityLevel`, goal or preference not in `src/constants/options.ts`, including an empty string, so leave unset fields out. The app applies the same rules from `src/features/profile/profileRules.ts`: picking a base diet replaces the other (`toggleDietaryPreference`), onboarding pages declare cross-field rules as `validate`, which shows under the fields and blocks Continue, and the profile form checks the target. `PUT /profiles` only checks the target when the goal or target changes.
- Onboarding draft `dislikedFoods` and `allergies` are comma-separated strings, while the profile model uses `string[]`. `onboardingService` posts the raw strings, and account-service splits them on commas.

## Identity

Use `profile.id` for API calls. **`user.id` is fake** after login or OTP: `authService.buildUser` always returns `'user-1'`, and `user.name` is a placeholder.

## Mock versus real

| Feature | Source |
| --- | --- |
| Auth, profile, preferences, fridge | Real |
| Weight, today's hydration and coffee, weekly charts | Real |
| Progress history, weekly consistency | Real, from `/scores/me/activity` |
| Blood test uploads and parsed results | Real. Only the user's own: another user's upload id is a 404 on read, hide and delete (medical-service from 2026-11-08) |
| Diet plans, meal take and swap | Real |
| Onboarding pages | Local with a 250 ms delay. The answers are posted when the plan is created |
| Leaderboards, score breakdown, friends | Real |
| Shared meals (groups, invitations, shared plans) | Real, from 2026-11-08 |
| Notifications inbox and unread count | Real, from 2026-11-08 |
| Hydration and coffee history | `mockHistorical*`, set at store creation |
| `generateRecommendation` | Local template, not AI |
| `useInventoryStore`, `useDailyLogStore` | Mock, used only by `MealRecommendationScreen`, which is not in any navigator |

The fridge lives in `profile.availableIngredients` (`InventoryScreen`). `useInventoryStore` is legacy; do not build on it.

## Diet plan and daily log

- **`meal.dayOfWeek` is not a weekday.** It is a 1-based plan day. Get its date from `getPlanDayDate` in `src/features/dietPlan/planSchedule.ts`.
- **Plan dates are calendar days.** `startDate` and `endDate` arrive as midnight UTC timestamps, and `getPlanSchedule` reads the date part. `POST /diet-plans` and the renew route take `YYYY-MM-DD`, from today up to 14 days ahead; a timestamp is a 400.
- **`GET /diet-plans/active` chooses by date:** the plan running today, else the soonest upcoming one, else the latest to have ended. The plan can be `upcoming`, `running` or `ended`, so don't assume it's in progress. Meals in an upcoming plan can be swapped but not logged.
- **`POST /diet-plans` replaces the current plan.** A plan running today ends yesterday and plans not yet started disappear, so the new plan is always the one shown, with day 1 on its start date. Today and the days until it starts aren't scored. `PlanStartDateScreen` warns about this when a plan is loaded.
- **Replacing a running plan resets the week's plan points.** Every plan day earlier that week loses its meal, water and coffee points but still counts towards the average; weight points stand. Before creating the plan, `PlanStartDateScreen` adds up those days' points from `getWeekActivity` (plus today's if the new plan starts later) and, if any, asks for confirmation and offers "Swap meals instead", which leaves onboarding for the DietPlan tab. Such days come back as `SCORED` with 0 points and `statusReason: 'plan_replaced'`, and their logs with `reason: 'plan_replaced'`.
- **Renewal:** `earliestRenewalDate` is set from the plan's last day until a next plan exists, and only then show Renew. `nextPlan` is the renewal waiting for its start date, with its meals, so people can shop for it. It only appears while the current plan is still running; once it ends, the renewal itself is the active plan. A repeat is a 409.
- `DietPlanScreen` refetches on focus, because the tab stays mounted while the current plan changes with the date.
- `meal.isTaken` and `meal.isExtra` drive the UI. Extra meals are saved with `addExtraMeal` and always render as logged. Its body takes `proteinG`, `carbsG` and `fatG` beside `calories`; recommendation-service before 2026-11-06 ignores them.
- `mealType` values are capitalized (`Breakfast`, `Lunch`, `Snack`, `Dinner`) for sorting. Other values sort last.
- `plan.goals` is free text. `GoalsCard` splits it on the literal `Target overview:`, `Rationale:`, `Tips:`, and `•`.
- After a plan mutation, the UI calls `fetchActivePlan()` rather than patching state.
- **Generating a plan outlives its request.** Create, renew and feedback update take about a minute, and the server finishes and saves the plan even when the app is backgrounded or killed. iOS suspends the app in the background, so the request then fails or stalls. Start these through `runPlanGeneration` (`src/features/dietPlan/planGeneration.ts`): after an interruption it follows `GET /diet-plans/generation`, and recognizes its generation by an id different from the one read before starting. A saved plan's generation reads `completed` for a day, like `failed` and `cancelled`; a 404 after following one means it stopped without an end (its server crashed). Until recommendation-service from 2026-11-08 it was deleted instead, so the 404 made the app report a failure for a saved plan, and "Go back" reverted the onboarding answers. One generation runs per user, and starting another is a 409. A generation left running by an earlier session is found once, at launch (see dietician-session-flow), and opens `GeneratingDietPlanScreen`. Don't add checks on screen focus. The generating and check-in screens can cancel through `POST /diet-plans/generation/cancel` (`useCancelGeneration`). Nothing is saved, and the wait then throws an error that `isGenerationCancelled` recognizes, which is where a screen moves on. A cancel is a 409 once the generation is saving its plan, which then still arrives.

`POST /daily-logs` is an upsert:

- **Fields you leave out keep their value**, so send only what changed. Every meal sent is added as a new log, so never resend a log you read back: resending duplicates its meals.
- **Water and coffee count towards scores only when `logDate` is today in the business timezone**, because a past day mustn't be filled in later. Hydration sends `logDate: 'today'`. Without an `Accept-Timezone` header, the server resolves that in the business timezone (Europe/Istanbul), which is the day scores use.
- `DietPlanScreen` logs meals directly with `progressService`, leaving `useHydrationStore.rawDailyLog` stale. That's harmless now that hydration writes don't resend it.

## Shared meals

A user can eat the same meals as up to 2 friends (`maxFriends` on the group). Each member still has their own plan, with the same dishes in portions worked out from their own goal and weight, so logging, scores and the plan screens work as usual. `SharedPlanScreen` manages it; `DietPlanScreen` links there.

- **Groups:** the owner invites friends (`POST /diet-plans/shared/group/invites`, which creates the group); invitations count towards the limit. Someone is in one group at a time. Accepting drops the user's other invitations and deletes a group of their own with nobody else in it. Only the owner invites, removes members and starts plans; the owner leaving deletes the group. Leaving or being removed keeps the plan as an ordinary one.
- `GET /diet-plans/shared/group` is a 404 when the user isn't in a group, so `getGroup` returns null. Members see each other's names only.
- The server removes anyone who stops being the owner's friend, or has a block with another member, the next time the group is read or used. If account-service can't answer, these routes are a 503 rather than going ahead unchecked.
- **Starting a plan:** `POST /diet-plans/shared` (owner only, `startDate` from today, not yesterday) replaces **only the owner's** plan from that date. Its meals suit every joined member (combined allergies, diets, dislikes, pregnancy-safe if anyone is pregnant), but only the owner's portions are worked out. Start it through `runPlanGeneration`; the generation (kind `shared`) is the owner's alone. The owner gets `dietplan.ready`; each other joined member gets a `sharedplan.plan_offered` push (`groupId`, `ownerUserId`, `startDate`) and an offer. From recommendation-service 2026-11-08; before that, every member's plan was replaced at once.
- **Offers:** a member's plan stays as it is until they answer. `GET /diet-plans/shared/offer` (404: none) gives `id`, `owner`, `startDate` (the shared plan's first day, or today once it has started) and `endDate`. `POST /diet-plans/shared/offer/:id/accept` works out their portions (an AI call, about a minute, kind `shared`, so go through `runPlanGeneration`) and replaces their plan from `startDate`; the usual score rule applies. `POST .../offer/:id/decline` keeps their plan, and they stay in the group. One offer per user: a newer shared plan replaces it (a new `id`, so answering the old one is a 404), and it disappears when they leave the group or the owner's plan ends or is replaced. State lives in `useSharedPlanOfferStore` (reset at logout). `useSharedPlanOfferPrompt` (in `AppTabNavigator`) asks once per offer per launch, on open, on foreground and on a foreground push, with the points at risk (`features/sharedPlan/sharedPlanOffer.ts`); `SharedPlanScreen` and the Diet Plan shared card show it too.
- **Plan fields:** `sharedGroupId` is set on a plan, and `isShared` on its meals, only while the user is still in that group.
- **Swapping a shared meal** (`swapMeal(id, scope?)`, `PATCH .../swap?scope=everyone|me`). Only the group's owner, who started the plan, can swap for everyone: `plan.isSharedOwner` says who that is, and `MealCard` asks only them "Swap for everyone" or "Just for me". Other members swap with `me` and see no popup; `everyone` from them is a 403 (`ErrOwnerOnly`). With no `scope`, the server picks `everyone` for the owner and `me` for anyone else. Everyone: every member who hasn't logged it as eaten or swapped it for themselves gets the new meal in their own portion, and members who accept the offer later get it too. Once nobody else qualifies, it swaps just the owner's copy, which is still the group's new meal. Me: only the user's copy changes and loses `isShared`; the group's meal stays as it was, for later joiners as well. recommendation-service keeps the group's version in `shared_meals` (migration 010) and sends `isSharedOwner`, both from 2026-11-09. An older server sends no `isSharedOwner` and ignores `scope`, so every swap there is for everyone: deploy the server first.
- `PATCH /diet-plans/active/feedback` is a 409 on a shared plan.
- **Renewal:** the owner's check-in renews the shared plan: the owner gets it and the others are offered it. A member's check-in renews just for them, and the owner's renewal replaces that plan only if they switch.
- `sharedplan.invite_received` pushes carry `groupId` and `ownerUserId`. The owner gets `sharedplan.invite_accepted`, with `groupId` and `memberUserId`, when a friend joins. `sharedplan.plan_offered` opens `SharedPlanScreen`.

## Notifications

notification-service is the only place notifications are kept, and the app reads them from its API process (port 8087 locally, a separate process from the worker that sends pushes). Never store notifications in another service or build a list from local state.

- `GET /notifications?limit&cursor` gives a page newest first, with `unreadCount` and `nextCursor` (null on the last page). Page with the cursor, never an offset.
- Each item has `title` and `body` already rendered, in the `Accept-Language` language (English without it), and `data`, the same strings a push carries, `type` included. Route both through `openNotification` (`src/features/notifications/openNotification.ts`), so the inbox and a push open the same screen.
- `POST /notifications/:id/read` and `POST /notifications/read-all` return `{ unreadCount }`; keep the badge (`useNotificationStore`) from those answers. Marking one already read is fine; another user's ID is a 404.
- Every push carries `notificationId`, the inbox ID, and opening the push marks it read.
- Every notification to the user is in the inbox even when push is off, its channel lists it nowhere else, or the phone has no FCM token. Nothing tells the app one arrived except a push, so `NotificationBell` reads the count on focus, on foreground and every minute.
- Requests are limited to 120 a minute per user.

## Pregnancy plan

A side program, not a goal: offered as the "Special program" chip under Sex (onboarding basics page and the profile form), only for `female` or `other`. Added 2026-11-08.

- **Write the week, read the week.** `PUT /profiles` and `POST /profiles/onboarding` take `pregnancyWeek`: 1–42 starts or moves the plan, 0 ends it, left out keeps it. The server stores a due date from it, so send it only when the user changes it (the profile form compares with `profile.pregnancyWeek`): resending the same week can move the due date by days. Onboarding always sends it.
- `GET /profiles` returns `pregnancyWeek`, worked out from the due date each time, and `pregnancyDueDate` (`YYYY-MM-DD`). Past week 42 the pregnancy is over and both disappear; nothing has to clear it.
- **Rules, on both sides:** a `400` for a pregnancy plan with `male`, or with a goal other than `maintenance` or `habit_building` (no calorie deficit in pregnancy). App: `getPregnancyGoalError`, `getPregnancyWeekError`, `canHavePregnancyPlan` in `profileRules.ts`. Picking male hides the chip and saving sends 0, so the server never sees both.
- The goal rule also keeps pregnant users off the leaderboards: only `weight_loss` is scored.
- While pregnant, `targetWaterMl` is 300 ml higher (still at most 3 L) and `targetCoffeeCups` is 2.
- Plans: recommendation-service sends the week and trimester at the plan's start date. The AI adds +0/+340/+450 kcal by trimester, never a deficit, and the food-safety rules in `packages/openai/prompts/pregnancy.txt` apply to plans, swaps and shared plans (every shared meal is pregnancy-safe for everyone, and the pregnancy is never mentioned to other members).

## Country

Where the user lives, so plans use ingredients that are easy to buy there, with a light touch of the local cuisine. The plan stays in English. Added 2026-11-08.

- `countryCode` is an upper-case ISO 3166-1 alpha-2 code (`TR`), read from `GET /profiles` and written with `PUT /profiles` or `POST /profiles/onboarding`. Anything else, including `''` or lower case, is a `400`. Left out, the server keeps it, so it can't be cleared.
- The list is `src/constants/countries.ts`; every code in it passes account-service's validator. Pick with `CountryPicker` (`src/components/`), which also suggests the phone's region, but never pre-fill from it: the language setting often isn't where someone lives.
- Asked on the onboarding preferences page (required), and changeable in the profile's Food preferences card, which saves straight away. Users onboarded earlier have none, and their plans are made as before until they set one.
- It changes the next plan, renewal, feedback update and swap, not the plan already made. recommendation-service sends the English country name, which adds `packages/openai/prompts/local-cuisine.txt` to the prompt. Allergies, diets, dislikes, calories and pregnancy rules still win. A shared plan uses the country its members agree on, and none if they disagree.

## Leaderboards

- A leaderboard is a 503 rather than a partial list when account-service can't answer. Show the error state, never an empty ranking. A background refresh that fails keeps the rankings already on screen.
- Scores are live: the server recalculates within seconds of any log or profile change. `LeaderboardScreen` reloads the current period every 20 seconds while it's focused and the app is active, and when the app comes back to the foreground. It doesn't reload past periods, or after "Show more", which a reload would collapse to one page. The limit is 60 leaderboard requests a minute per user, so don't poll faster.
- A score with no `currentWeightKg` in its breakdown has had no weigh-in since the baseline, so weight counts as 0 for now.
- Weight is typed in and never verified. Instead, the loss that scores (`countedLossKg`) is capped by what the logged meals' calorie deficit explains (`deficitKcal`, `explainedLossKg`), plus 25%. `actualLossKg` is the scale's figure. So logging meals with their calories is what makes weight loss count: keep sending `calories` when logging a meal.
- Identify the current user with `isCurrentUser` from the response, never with `user.id`.
- Read previous and next periods from `previousPeriodStart` and `nextPeriodStart`, instead of working out dates on the client. `nextPeriodStart` is null for the current period.
- Page with a counted offset, not `participants.length`: the server can leave a row out of a page.
- Ranks can repeat or skip (1, 2, 2, 4) because tied users share a rank.
- `GET /scores/me/breakdown` holds the user's weights and only ever returns their own data. Never show another user's `statusReason` or breakdown.
- The score is 55 weight progress, 30 meals, 10 water and 5 coffee.
- `GET /scores/me/days?from&to` gives each day's habit points, 45 at most:
    - Meals: 10 per breakfast, lunch and dinner, counted on the day they were logged (`logged_at`), not by plan day.
    - Water: up to 10, in proportion to `waterTargetMl`. The target comes from body weight (30 ml/kg, 1.5–3 L), not from the user's `targetWaterMl`.
    - Coffee: 5 for staying within `coffeeLimitCups` (the user's target, at most 4) on a day with water logged.
- The response also splits each week into `weightPoints`, `mealPoints`, `waterPoints` and `coffeePoints`, which add up to `totalScore`. Show the server's numbers; don't work points out on the client. `DietPlanScreen` and `HydrationTrackingScreen` hide them if the request fails.
- `GET /scores/me/activity?periodStart` (`getWeekActivity`) gives one week, newest day first, for the Progress tab's history:
    - Each day's `activities` are its meals and weigh-ins, newest first, then water and coffee as day totals with no `loggedAt`. Their points add up to the day's.
    - A weigh-in's `points` is null: it counts towards the week's weight points. Anything on a day that isn't `SCORED` or `IN_PROGRESS` earns nothing, and the day's `statusReason` says why. `reason` explains a 0 on a scored day.
    - `consistency` is the week's habit share without weight. It's the only source of "Weekly consistency", on both Home and Progress. Null until something is due, or when the user isn't scored.
    - A `finalized` week shows the leaderboard's stored score. Page back with `previousPeriodStart`, which is null when nothing was logged earlier.
- `ProgressEntry` has no consistency or goal fields. Goal progress is worked out on the client from the first and latest weigh-ins and `profile.targetWeightKg`, because it isn't a score.
- Leaderboard and friend data stays in screen state, so it doesn't outlive a logout.
- Pressing anyone else on the leaderboard opens `UserProfileScreen`. `GET /friends/users/:userId` (`friendService.getProfile`) gives their `displayName`, `relationship`, `requestId`, and `friendsSince` for friends only. An unknown user and a block in either direction are the same 404, so `getProfile` returns null and the screen says the profile isn't available. The rank and points shown come from the leaderboard entry through route params: the server has no endpoint for another user's score, and their breakdown stays private.

## Dates

- **Open:** `new Date().toISOString().split('T')[0]` yields the UTC date. In Turkey (UTC+3) it returns yesterday between 00:00 and 03:00. It still appears in `useHydrationStore`'s initial `date` fields. Use `toCalendarDate` and `addCalendarDays` from `src/utils/date.ts` instead.
- Hydration uses the literal `'today'` as the date, so the server decides the day: in `Accept-Timezone` if sent, otherwise in the business timezone.

## Health data and copy

- Do not log health data. **Open:** `console.log` of the whole profile in `useProfileStore`. Remove it when working there.
- Reuse `HEALTH_NOTICE`, `BLOOD_TEST_DISCLAIMER`, and `AI_GUIDANCE_NOTICE` from `src/constants/health.ts` instead of writing new disclaimers.
- User-facing guidance must not suggest severe restriction or compensating for overeating. Match the tone of `buildRecoveryRecommendation`. Never present output as diagnosis.
