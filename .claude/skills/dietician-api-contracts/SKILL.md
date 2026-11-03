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

Use `fetchWithAuth` for authenticated calls, or `fetchData` when the response uses the `{ message, data }` envelope and failures should throw. `authService` uses raw `fetch` on purpose, because `apiClient` imports it for token refresh.

## Response shapes are not uniform

| Endpoint | Shape | Client behavior |
| --- | --- | --- |
| Most endpoints | `{ data: ... }` | Service unwraps `json.data` |
| `GET /foods` | `{ foods: [...] }` | No `data` wrapper |
| `/diet-plans*` | `{ message, data }` | Service returns raw JSON; **the store** unwraps `response?.data` |
| `POST /diet-plans/active/renew` | `{ message, data }` | Exception: uses `fetchData`, so the check-in can show the server's translated error |
| `GET /uploads` | `data` can be null | Falls back to `[]` |
| `GET /uploads/:id` | `{ data: { upload } }` | Caller reads `detail.upload` |
| `GET /profiles` | 404 means no profile yet | Normal for a first login; return `null` |
| `GET /diet-plans/active` | 404 means no plan | Return `null` |
| `GET /daily-logs/:date` | 404 means no log | Return `null` |

## Error handling differs by service

- `profileService`, `bloodTestService`, `recommendationService`, `leaderboardService`, and `friendService` throw.
- **`progressService` catches everything** and returns `null`, `[]`, or `false`. Callers must check the return value, because `try/catch` around it never fires.

Open defects caused by this:

- `MealCard.handleLogMeal` calls `upsertDailyLog`, then `markMealAsTaken`. If the first fails, the meal is still marked taken with no log. The same applies to extra meals with `addExtraMeal`.

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
- `updateProfile` sends two `PUT`s, which are not atomic, and returns its input rather than server data.
- **`targetWaterMl` and `targetCoffeeCups` are read-only.** The server sets them from weight and age (30 ml/kg within 1.5–3 L; 4 cups, or 1 under 18) and ignores them on writes, so never send them or add an input for them. They follow each weigh-in on the server, but the app's copy only updates when the profile reloads. `HomeScreen` passes them to `useHydrationStore.setTargets`.
- Onboarding draft `dislikedFoods` and `allergies` are comma-separated strings, while the profile model uses `string[]`. `onboardingService` posts the raw strings. Verify the backend accepts them.

## Identity

Use `profile.id` for API calls. **`user.id` is fake** after login or OTP: `authService.buildUser` always returns `'user-1'`, and `user.name` is a placeholder. `buildProfileFromDraft` in `OnboardingScreen` can also produce the fake id `'profile-1'`.

## Mock versus real

| Feature | Source |
| --- | --- |
| Auth, profile, preferences, fridge | Real |
| Weight, today's hydration and coffee, weekly charts | Real |
| Progress history, weekly consistency | Real, from `/scores/me/activity` |
| Blood test uploads and parsed results | Real |
| Diet plans, meal take and swap | Real |
| Onboarding pages | Only the last page calls the backend; other pages are local with a 250 ms delay |
| Leaderboards, score breakdown, friends | Real |
| Hydration and coffee history | `mockHistorical*`, set at store creation |
| `generateRecommendation` | Local template, not AI |
| `useInventoryStore`, `useDailyLogStore` | Mock, used only by `MealRecommendationScreen`, which is not in any navigator |

The fridge lives in `profile.availableIngredients` (`InventoryScreen`). `useInventoryStore` is legacy; do not build on it.

## Diet plan and daily log

- **`meal.dayOfWeek` is not a weekday.** It is a 1-based plan day. Get its date from `getPlanDayDate` in `src/features/dietPlan/planSchedule.ts`.
- **Plan dates are calendar days.** `startDate` and `endDate` arrive as midnight UTC timestamps, and `getPlanSchedule` reads the date part. `POST /diet-plans` and the renew route take `YYYY-MM-DD`, from today up to 14 days ahead; a timestamp is a 400.
- **`GET /diet-plans/active` chooses by date:** the latest plan to have started, or the soonest upcoming one. The plan can be `upcoming`, `running` or `ended`, so don't assume it's in progress. Meals in an upcoming plan can be swapped but not logged.
- **Renewal:** `earliestRenewalDate` is set from the plan's last day until a next plan exists, and only then show Renew. `nextPlan` is the renewal waiting for its start date, with its meals, so people can shop for it. A repeat is a 409.
- `DietPlanScreen` refetches on focus, because the tab stays mounted while the current plan changes with the date.
- `meal.isTaken` and `meal.isExtra` drive the UI. Extra meals are saved with `addExtraMeal` and always render as logged.
- `mealType` values are capitalized (`Breakfast`, `Lunch`, `Snack`, `Dinner`) for sorting. Other values sort last.
- `plan.goals` is free text. `GoalsCard` splits it on the literal `Target overview:`, `Rationale:`, `Tips:`, and `•`.
- After a plan mutation, the UI calls `fetchActivePlan()` rather than patching state.

`POST /daily-logs` is an upsert:

- **Fields you leave out keep their value**, so send only what changed. Every meal sent is added as a new log, so never resend a log you read back: resending duplicates its meals.
- **Water and coffee count towards scores only when `logDate` is today in the business timezone**, because a past day mustn't be filled in later. Hydration sends `logDate: 'today'`. Without an `Accept-Timezone` header, the server resolves that in the business timezone (Europe/Istanbul), which is the day scores use.
- `DietPlanScreen` logs meals directly with `progressService`, leaving `useHydrationStore.rawDailyLog` stale. That's harmless now that hydration writes don't resend it.

## Leaderboards

- A leaderboard is a 503 rather than a partial list when account-service can't answer. Show the error state, never an empty ranking.
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

## Dates

- **Open:** `new Date().toISOString().split('T')[0]` yields the UTC date. In Turkey (UTC+3) it returns yesterday between 00:00 and 03:00. It still appears in `useHydrationStore`'s initial `date` fields. Use `toCalendarDate` and `addCalendarDays` from `src/utils/date.ts` instead.
- Hydration uses the literal `'today'` as the date, so the server decides the day: in `Accept-Timezone` if sent, otherwise in the business timezone.

## Health data and copy

- Do not log health data. **Open:** `console.log` of the whole profile in `useProfileStore`. Remove it when working there.
- Reuse `HEALTH_NOTICE`, `BLOOD_TEST_DISCLAIMER`, and `AI_GUIDANCE_NOTICE` from `src/constants/health.ts` instead of writing new disclaimers.
- User-facing guidance must not suggest severe restriction or compensating for overeating. Match the tone of `buildRecoveryRecommendation`. Never present output as diagnosis.
