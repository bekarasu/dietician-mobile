---
name: dietician-session-flow
description: How startup, auth, token refresh, onboarding, and navigator switching work in dietician-mobile, including known state bugs. Use before changing useAuthStore, useOnboardingStore, useProfileStore, useAppBootstrap, apiClient, tokenService, RootNavigator or other navigators, login, register, OTP, logout, onboarding, or any Zustand store that holds user data, and when debugging being logged out, wrong screens after login, or data from a previous user.
---

# Dietician session flow

All Zustand stores are in memory, with no `persist` middleware. Only the tokens survive a restart (SecureStore), so everything else is rebuilt during startup.

## Screens are chosen by state

`RootNavigator` picks one of three navigators, or the generating screen:

```
!isAuthenticated                                 -> AuthNavigator
isAuthenticated && legal pending                 -> LegalNavigator (updated terms to accept)
isAuthenticated && !isCompleted                  -> OnboardingNavigator
isAuthenticated && isCompleted && resumedGeneration -> GeneratingDietPlanScreen (no navigator, no route)
isAuthenticated && isCompleted                   -> AppStackNavigator
```

`resumedGeneration` (`useDietPlanStore`) is a plan generation an earlier session left running, found once at launch. Without a route, `GeneratingDietPlanScreen` waits for it instead of creating a plan, then calls `completeOnboarding()` (which only sets `landingTab: 'DietPlan'` here) and clears it, so the app opens on the plan. If it's cancelled, or fails and the user presses Continue, and its kind is `create`, which only onboarding starts, the answers are reverted, and someone with none before that onboarding goes through it again.

Do not `navigation.navigate` across these. Change the store and let `RootNavigator` swap. For that reason, `login` and `verifyOTP` load the profile and restore onboarding state *before* setting `isAuthenticated`. Reversing the order flashes onboarding at returning users.

"Legal pending" is `useLegalStore.pending`: required legal documents with a version the user hasn't accepted (see dietician-api-contracts). `bootstrap`, `login` and `verifyOTP` call `checkPending()` before setting `isAuthenticated`, for the same reason. `checkPending` never throws, so a failed check lets the user in and the next launch or login asks again; it isn't rechecked on foreground, because swapping navigators mid-session would drop a running onboarding or plan generation. `LegalUpdateScreen` accepts them all (then `RootNavigator` moves on) or signs out. `logout` resets the store after clearing `isAuthenticated`.

## Onboarding completion is derived

Completion is not stored anywhere. It is recomputed from the profile:

```ts
profile.heightCm && profile.weightKg && profile.goalType
```

It is `isOnboardingComplete` in `src/features/onboarding/validation.ts`, used by `bootstrap`, `login`, `verifyOTP`, and `revertAnswers`.

End of onboarding:

1. The pages are local. The last one in `getOnboardingPages()` (now `blood-test`) opens `PlanStartDateScreen`. A blood test is the exception: it uploads when picked, and its id goes in `bloodTestUploadIds`.
2. `PlanStartDateScreen` asks when to start. "Create My Plan" calls `saveAnswers()`, which posts `/profiles/onboarding`, sets `hasSavedAnswers`, and reloads the profile. Then it passes `startDate` as a route param.
3. `GeneratingDietPlanScreen` creates the plan, then calls `completeOnboarding()`, which logs the onboarding weight now that the answers stay.
4. `RootNavigator` switches to `AppStackNavigator`.
5. `AppTabNavigator` uses `landingTab` (`'DietPlan'` here) as `initialRouteName`, then clears it. `initialRouteName` is read only on mount.

"Restart onboarding" on the profile sets `isCompleted: false` and `isRestarting: true`. While restarting, `OnboardingScreen` shows a close button and `PlanStartDateScreen` a "Keep my current plan" button. Both call `leaveOnboarding()`, which sets `isCompleted` back and `landingTab: 'ProfileGoals'`. Leaving saves nothing at any point, and removes the blood tests uploaded on the way. On Android, the back button goes back a page, and on the first page offers to leave.

Cancelling the plan undoes the onboarding too. `GeneratingDietPlanScreen` calls `revertAnswers()`, which asks account-service to put the profile back as it was before `saveAnswers`, then goes back to the start date with the answers still in the draft. If the revert fails, `hasSavedAnswers` stays set: the next `saveAnswers` reverts first, and `leaveOnboarding` tries again. The weight is logged only once a plan is created.

A failed generation stays on `GeneratingDietPlanScreen`, with the answers saved, until the user presses Try again, which creates the plan again, or Go back (or Android back), which reverts as cancelling does. If the app is closed meanwhile, startup reverts instead (step 3 below).

`GeneratingDietPlanScreen` skips plan creation without an error when `profile.id` is missing. Registration makes the profile, and login loads it before onboarding opens.

## Startup

`useAppBootstrap` shows a spinner until this finishes:

1. `useAuthStore.bootstrap()`: reads the token, loads the profile (errors swallowed), checks pending legal documents (errors swallowed), sets `isAuthenticated: true`.
2. `Promise.all` of profile, daily log, inventory, and progress `bootstrap()`.
3. If signed in with onboarding complete, `useDietPlanStore.checkGeneration()`: the app's only check for a running generation (`GET /diet-plans/generation`). It comes after step 2, which can still log out, so a stale result never reaches the next user. Its errors are swallowed. If the latest generation is a `create` that failed or was cancelled, the app was closed before leaving it, so `revertAnswers()` runs. The server keeps a generation for a day, and reverting again changes nothing, as the snapshot goes with the first revert.
4. Any rejection: `logout()`.

`useProfileStore.bootstrap` exits early only when a profile is loaded, so a missing profile is fetched again in step 2. Hydration is not part of startup; `HomeScreen` loads it.

## Token refresh ordering

`fetchWithAuth` queues concurrent 401s behind one refresh. Keep the `.then()` chain in `apiClient`: the subscriber must register synchronously after the refresh starts. With `await authService.refresh(...)` before subscribing, the first caller would subscribe after `onRefreshed` has run, and its promise would never resolve.

## Open defects

Check these before assuming a session bug is new. Fix them when the task touches the area.

1. **Any network failure at startup logs the user out.** If `GET /profiles` fails for any reason (offline, 500), step 2 rejects and `useAppBootstrap` calls `logout()`, which deletes the tokens. The code comment assumes 401 only. Treat auth failure and transient failure differently.
2. **An expired session leaves the user stranded.** When refresh fails, `fetchWithAuth` clears the tokens but never updates `useAuthStore`. `isAuthenticated` stays true, the app stays on `AppStackNavigator`, and every call returns 401 until restart. Refresh failure needs to reach the store, and `apiClient` must avoid an import cycle when doing so.
3. **`logout` only clears auth, profile, the diet plan, the notification badge, the shared plan offer and pending legal documents.** It also cancels the local reminders (`cancelAllReminders`), which name the user's meals (since 2026-11-08). `useNotificationStore.reset()` also drops an unread count still in flight, so it can't come back for the next user. Onboarding, hydration, and progress stores keep their data, so in the same app session:
   - The next user keeps `isCompleted: true`, and a brand-new account skips onboarding with no profile.
   - The previous user's health data stays in memory.

   Add new user-data stores to a shared reset at logout.
4. **The intro always shows.** `hasSeenOnboardingIntro` persistence is commented out in `useAuthStore`, with `hasSeen` hardcoded to `false`, and the `SecureStore` imports there are unused. Restoring the commented lines is the fix, if the behavior is not intended for current development.

## Shared auth state

`isLoading` and `error` on `useAuthStore` are shared by login, register, and OTP, and `isLoading` starts as `true`. An error from one screen can appear on another; clear it when adding a new auth screen.
