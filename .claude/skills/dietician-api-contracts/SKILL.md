---
name: dietician-api-contracts
description: Backend contracts and data sources for dietician-mobile, covering which of the four APIs owns what, response envelopes, field-name mismatches, error conventions, and which features are mocked. Use before adding or changing anything in src/services, store data loading, API response handling, profile or preferences fields, fridge/ingredients, diet plans, meal logging, hydration, weight, or blood test data, and before showing health guidance to users.
---

# Dietician API contracts

The backend code is not in this repo. This file records what the client shows as of 2026-11-01. Confirm anything marked "verify" against the backend before depending on it.

## Services

| Env key | Paths | Client |
| --- | --- | --- |
| `EXPO_PUBLIC_ACCOUNT_API_URL` | `/auth`, `/profiles` | `authService`, `profileService`, `onboardingService` |
| `EXPO_PUBLIC_MEDICAL_API_URL` | `/uploads` | `bloodTestService` |
| `EXPO_PUBLIC_PROGRESS_API_URL` | `/progress`, `/daily-logs` | `progressService` |
| `EXPO_PUBLIC_RECOMMENDATION_API_URL` | `/foods`, `/diet-plans` | `recommendationService` |

Use `fetchWithAuth` for authenticated calls. `authService` uses raw `fetch` on purpose, because `apiClient` imports it for token refresh.

## Response shapes are not uniform

| Endpoint | Shape | Client behavior |
| --- | --- | --- |
| Most endpoints | `{ data: ... }` | Service unwraps `json.data` |
| `GET /foods` | `{ foods: [...] }` | No `data` wrapper |
| `/diet-plans*` | `{ message, data }` | Service returns raw JSON; **the store** unwraps `response?.data` |
| `GET /uploads` | `data` can be null | Falls back to `[]` |
| `GET /uploads/:id` | `{ data: { upload } }` | Caller reads `detail.upload` |
| `GET /profiles` | 404 means no profile yet | Normal for a first login; return `null` |
| `GET /diet-plans/active` | 404 means no plan | Return `null` |
| `GET /daily-logs/:date` | 404 means no log | Return `null` |

## Error handling differs by service

- `profileService`, `bloodTestService`, and `recommendationService` throw.
- **`progressService` catches everything** and returns `null`, `[]`, or `false`. Callers must check the return value, because `try/catch` around it never fires.

Open defects caused by this:

- `useHydrationStore.addWater` and `addCoffee` revert the optimistic update in `catch`, which is unreachable. A failed save stays on screen as if it succeeded. Revert when the result is `null`.
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
- Onboarding draft `dislikedFoods` and `allergies` are comma-separated strings, while the profile model uses `string[]`. `onboardingService` posts the raw strings. Verify the backend accepts them.

## Identity

Use `profile.id` for API calls. **`user.id` is fake** after login or OTP: `authService.buildUser` always returns `'user-1'`, and `user.name` is a placeholder. `buildProfileFromDraft` in `OnboardingScreen` can also produce the fake id `'profile-1'`.

## Mock versus real

| Feature | Source |
| --- | --- |
| Auth, profile, preferences, fridge | Real |
| Weight, today's hydration and coffee, weekly charts | Real |
| Blood test uploads and parsed results | Real |
| Diet plans, meal take and swap | Real |
| Onboarding pages | Only `habits` calls the backend; other pages are local with a 250 ms delay |
| Friend competition | `mockFriends` |
| Hydration and coffee history | `mockHistorical*`, set at store creation |
| `generateRecommendation` | Local template, not AI |
| `useInventoryStore`, `useDailyLogStore` | Mock, used only by `MealRecommendationScreen`, which is not in any navigator |

The fridge lives in `profile.availableIngredients` (`InventoryScreen`). `useInventoryStore` is legacy; do not build on it.

## Diet plan and daily log

- **`meal.dayOfWeek` is not a weekday.** It is a 1-based plan day: `DietPlanScreen` computes the date as `startDate + (day - 1)`.
- `meal.isTaken` and `meal.isExtra` drive the UI. Extra meals are saved with `addExtraMeal` and always render as logged.
- `mealType` values are capitalized (`Breakfast`, `Lunch`, `Snack`, `Dinner`) for sorting. Other values sort last.
- `plan.goals` is free text. `GoalsCard` splits it on the literal `Target overview:`, `Rationale:`, `Tips:`, and `•`.
- After a plan mutation, the UI calls `fetchActivePlan()` rather than patching state.

`POST /daily-logs` is an upsert, but its merge rule is unknown; verify it before changing this flow. It matters because:

- Hydration writes spread `rawDailyLog` (including `meals`) back to the server.
- `DietPlanScreen` logs meals directly with `progressService`, leaving `rawDailyLog` stale.
- If upsert replaces `meals`, a later water update could drop a meal just logged.

## Dates

- **Open:** `new Date().toISOString().split('T')[0]` yields the UTC date. In Turkey (UTC+3) it returns yesterday between 00:00 and 03:00. It appears in `DietPlanScreen.getLogDateForDay`, `ProgressDashboardScreen`, and `useHydrationStore`. Build local dates with `getFullYear`/`getMonth`/`getDate`, as `getDaysOfWeek` in `ProgressDashboardScreen` does.
- Hydration uses the literal `'today'` as the date, so the server decides the day. Verify which timezone it uses.

## Health data and copy

- Do not log health data. **Open:** `console.log` of the whole profile in `useProfileStore` and `onboardingService`. Remove them when working there.
- Reuse `HEALTH_NOTICE`, `BLOOD_TEST_DISCLAIMER`, and `AI_GUIDANCE_NOTICE` from `src/constants/health.ts` instead of writing new disclaimers.
- User-facing guidance must not suggest severe restriction or compensating for overeating. Match the tone of `buildRecoveryRecommendation`. Never present output as diagnosis.
