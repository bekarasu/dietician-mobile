---
name: dietician-session-flow
description: How startup, auth, token refresh, onboarding, and navigator switching work in dietician-mobile, including known state bugs. Use before changing useAuthStore, useOnboardingStore, useProfileStore, useAppBootstrap, apiClient, tokenService, RootNavigator or other navigators, login, register, OTP, logout, onboarding, or any Zustand store that holds user data, and when debugging being logged out, wrong screens after login, or data from a previous user.
---

# Dietician session flow

All Zustand stores are in memory, with no `persist` middleware. Only the tokens survive a restart (SecureStore), so everything else is rebuilt during startup.

## Screens are chosen by state

`RootNavigator` picks one of three navigators:

```
!isAuthenticated              -> AuthNavigator
isAuthenticated && !isCompleted -> OnboardingNavigator
isAuthenticated && isCompleted  -> AppStackNavigator
```

Do not `navigation.navigate` across these. Change the store and let `RootNavigator` swap. For that reason, `login` and `verifyOTP` load the profile and restore onboarding state *before* setting `isAuthenticated`. Reversing the order flashes onboarding at returning users.

## Onboarding completion is derived

Completion is not stored anywhere. It is recomputed from the profile:

```ts
profile.heightCm && profile.weightKg && profile.goalType
```

This check is repeated in `bootstrap`, `login`, and `verifyOTP`. Change all three together, or extract it.

End of onboarding:

1. The last page in `ONBOARDING_PAGES` (now `blood-test`) posts `/profiles/onboarding`, and `OnboardingScreen` calls `setProfile`. `onboardingService` picks the last page from the array, so reordering pages moves the post with it.
2. `PlanStartDateScreen` asks when to start and passes `startDate` as a route param.
3. `GeneratingDietPlanScreen` creates the plan, then calls `completeOnboarding()`.
4. `RootNavigator` switches to `AppStackNavigator`.
5. `AppTabNavigator` uses `landingTab` (`'DietPlan'` here) as `initialRouteName`, then clears it. `initialRouteName` is read only on mount.

"Restart onboarding" on the profile sets `isCompleted: false` and `isRestarting: true`. While restarting, `OnboardingScreen` shows a close button and `PlanStartDateScreen` a "Keep my current plan" button. Both call `leaveOnboarding()`, which sets `isCompleted` back and `landingTab: 'ProfileGoals'`. Leaving before the last page saves nothing; leaving at the start date keeps the saved answers and the current plan. On Android, the back button goes back a page, and on the first page offers to leave.

`GeneratingDietPlanScreen` skips plan creation without an error when `profile.id` is missing, so make sure the profile is set in step 1.

## Startup

`useAppBootstrap` shows a spinner until this finishes:

1. `useAuthStore.bootstrap()`: reads the token, loads the profile (errors swallowed), sets `isAuthenticated: true`.
2. `Promise.all` of profile, daily log, inventory, and progress `bootstrap()`.
3. Any rejection: `logout()`.

`useProfileStore.bootstrap` exits early only when a profile is loaded, so a missing profile is fetched again in step 2. Hydration is not part of startup; `HomeScreen` loads it.

## Token refresh ordering

`fetchWithAuth` queues concurrent 401s behind one refresh. Keep the `.then()` chain in `apiClient`: the subscriber must register synchronously after the refresh starts. With `await authService.refresh(...)` before subscribing, the first caller would subscribe after `onRefreshed` has run, and its promise would never resolve.

## Open defects

Check these before assuming a session bug is new. Fix them when the task touches the area.

1. **Any network failure at startup logs the user out.** If `GET /profiles` fails for any reason (offline, 500), step 2 rejects and `useAppBootstrap` calls `logout()`, which deletes the tokens. The code comment assumes 401 only. Treat auth failure and transient failure differently.
2. **An expired session leaves the user stranded.** When refresh fails, `fetchWithAuth` clears the tokens but never updates `useAuthStore`. `isAuthenticated` stays true, the app stays on `AppStackNavigator`, and every call returns 401 until restart. Refresh failure needs to reach the store, and `apiClient` must avoid an import cycle when doing so.
3. **`logout` only clears auth and profile.** Onboarding, diet plan, hydration, and progress stores keep their data, so in the same app session:
   - The next user keeps `isCompleted: true`, and a brand-new account skips onboarding with no profile.
   - The previous user's health data stays in memory.

   Add new user-data stores to a shared reset at logout.
4. **The intro always shows.** `hasSeenOnboardingIntro` persistence is commented out in `useAuthStore`, with `hasSeen` hardcoded to `false`, and the `SecureStore` imports there are unused. Restoring the commented lines is the fix, if the behavior is not intended for current development.

## Shared auth state

`isLoading` and `error` on `useAuthStore` are shared by login, register, and OTP, and `isLoading` starts as `true`. An error from one screen can appear on another; clear it when adding a new auth screen.
