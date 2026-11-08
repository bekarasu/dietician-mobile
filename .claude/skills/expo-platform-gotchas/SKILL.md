---
name: expo-platform-gotchas
description: Non-obvious iOS/Android, Expo SDK 58, and build behavior specific to eativio. Use before touching file uploads, FormData or fetch calls, TextInput/login/OTP/numeric forms, keyboard or safe-area layout, the tab bar, biometrics, SecureStore, env vars, app.json, native folders, charts, or running/building the app, and when something works on one platform but not the other, even if the task does not mention a platform.
---

# Expo platform gotchas

Stack checked against `node_modules` on 2026-11-01: Expo 58.0.22, RN 0.88.1, New Architecture, Hermes, Android edge-to-edge on. After an SDK bump, re-check the Networking section first.

Items marked **Open** are current defects. Fix them when working in that area, and do not copy the pattern.

## Networking: global `fetch` is `expo/fetch`

`expo/src/winter/runtime.native.ts` replaces the global `fetch` and patches `FormData`, so React Native's documented upload behavior does not apply here.

- **Do not use the classic `formData.append('file', { uri, name, type })`.** `expo/fetch` throws `Unsupported FormDataPart implementation` (`convertFormData.ts`). Read the file into a `Blob` first, as `bloodTestService.uploadBloodTest` does.
- `formData.append(name, blob, fileName)` is correct here. The third argument comes from Expo's patch, not from RN's `FormData`.
- The hand-set `Content-Type: multipart/form-data` in `uploadBloodTest` is harmless: `expo/fetch` replaces it with one carrying the boundary. New code can omit it.
- `fetch('file://...')` works on Android too, through `OkHttpFileUrlInterceptor`. `expo-file-system` is not needed for this.
- `uploadBloodTest` ignores its `mimeType` argument. The part's content type comes from `blob.type`, so check what the server receives before relying on it.
- `EXPO_PUBLIC_USE_RN_FETCH=1` restores RN's fetch and changes all of the above. Do not set it casually.

HTTP base URLs are allowed only in development: Android enables cleartext only in the `debug` and `debugOptimized` manifests, and iOS ATS allows local networking only. Release builds need HTTPS.

## Forms and text input

No screen sets `textContentType` or `autoComplete` yet. **Open** for the screens below; `AppTextInput` forwards these props.

| Field | Props |
| --- | --- |
| Login email (`LoginScreen`) | `textContentType="username"`, keep `keyboardType="email-address"`. iOS needs this to recognize the login pair. |
| Login password | `textContentType="password"` |
| Register email and password (`RegisterScreen`) | `textContentType="username"` and `"newPassword"` |
| OTP (`VerifyOTPScreen`) | `textContentType="oneTimeCode"`, `autoComplete="sms-otp"` for Android |

**Open: decimal comma corrupts values.** RN maps `keyboardType="numeric"` to `UIKeyboardTypeDecimalPad` on iOS, which shows `,` under a Turkish or other comma-decimal locale.

- `AppTextInput` already converts `,` to `.`, so use it for decimal fields.
- `inputMode="numeric"` gives a number pad with no decimal key on iOS, so `72.5` can't be typed. Use `inputMode="decimal"` for weights and heights, as the onboarding fields do.
- `WeightProgressScreen` used a raw `TextInput` with `parseFloat`, so `72,5` became `72`. Fixed 2026-11-07: it uses `AppTextInput` with `inputMode="decimal"` and `Number()`.
- Test weight entry with an iOS device region that uses a comma.
- `Number(x) || fallback` in `OnboardingScreen` and `ProfileGoalsScreen` hides `NaN` from input like `7.2.5`.

## Layout

- **`ScreenContainer` has no keyboard handling.** Its `ScrollView` uses the default `keyboardShouldPersistTaps`, so with the keyboard open, the first tap on "Log in" only closes the keyboard. Pass `scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}` on form screens, or fix it in the component.
- `ScreenContainer` sets `bounces={false}`, so iOS pull-to-refresh needs `scrollViewProps={{ bounces: true }}`.
- `ScreenContainer` is scrollable by default. Pass `scrollable={false}` when the screen owns a scroll view.
- No screen uses `KeyboardAvoidingView`. To keep a field above the keyboard on iOS, pass `automaticallyAdjustKeyboardInsets: true` in `scrollViewProps`, as `DietPlanScreen` and `WeightProgressScreen` do. If one is ever added under a native stack header, it needs `keyboardVerticalOffset` from `useHeaderHeight()`.
- Android has `adjustResize` together with edge-to-edge. Do not assume keyboard behavior from the manifest alone; test on a device or emulator.
- `AppTabNavigator` sets a numeric `height` in `tabBarStyle`, which disables React Navigation's inset math, so it derives `height` and `paddingBottom` from `useSafeAreaInsets()`. Change them together, or the tabs collide with the iPhone home indicator and the Android 3-button bar.
- Inside the tab navigator, `ScreenContainer` drops the bottom safe-area edge, detected through `BottomTabBarHeightContext`, because the tab bar already pads for the home indicator. Padding twice left an empty strip of about 34pt above the bar, which made it look raised. Screens that build their own `SafeAreaView` inside a tab need the same `edges`.
- **Open:** the top edge has the same double inset under a native stack header. `ScreenContainer` pads for the status bar even though the header already sits below it, so pushed screens such as Plan Check-In start with a gap of about 60pt. `HeaderHeightContext` can tell a header is shown.

## Biometrics and secure storage

- `BloodTestUploadScreen` asks for the screen lock (`unlock`) when it opens and before hiding or deleting a result. Any screen lock will do: it checks `getEnrolledLevelAsync()` is above `NONE`, so a phone with only a passcode gets in. A simulator with neither cannot. Do not bypass the check, as was done until 2026-11-08. Enroll instead: iOS Simulator > Features > Face ID > Enrolled; on Android, set a screen lock and fingerprint, then `adb -e emu finger touch 1`.
- Biometrics here are a client-side UI gate only. The API does not enforce them.
- `fallbackLabel` applies to iOS only.
- Face ID needs a native build. Expo Go does not support it. `npm run ios` and `npm run android` make native debug builds (`expo run`); `expo-dev-client` is not installed.
- iOS Keychain items survive app deletion, so reinstalling on iOS does not log the user out. Tokens in `tokenService` can outlive the install; use Log out, or erase the simulator.
- The `expo-secure-store` plugin excludes secure data from Android Auto Backup through `secure_store_*` rules. Do not replace `fullBackupContent` or `dataExtractionRules` without keeping them.

## Notifications

Meal reminders (since 2026-11-08) are local notifications from `expo-notifications`, in `src/features/reminders/`. No push yet.

- The plugin sets `enableRemoteNotifications: false`, so iOS gets no `aps-environment` entitlement and signing is unchanged. Wiring up push (the backend has device registration) means flipping it to `true`, which needs the Push capability on the App ID.
- Importing `expo-notifications` throws in a native build made before it was added. `mealReminders.ts` loads it only when `ExpoNotificationScheduler` exists, and reports `'unavailable'` otherwise; keep other imports of it behind the same check.
- `useMealReminderSync` (mounted in `AppTabNavigator`) schedules one-shot date triggers for the next 7 days from the active plan and its `nextPlan`, one per meal type and day, and re-syncs on plan change, settings change and app foreground. It diffs by a `signature` in the notification data, because the plan reloads on every visit to Today. iOS keeps at most 64 pending notifications.
- It waits for `useDietPlanStore.planLoadedAt` before touching anything, because a null `activePlan` alone doesn't tell "no plan" from "not loaded".
- Settings are per device, in SecureStore (`MEAL_REMINDER_SETTINGS`), so on iOS they survive a reinstall while the permission does not. The switch shows on only when both the setting and the permission allow it.
- Android 13 shows its permission prompt only after a channel exists, so `requestReminderPermission` creates `meal-reminders` first. Without `SCHEDULE_EXACT_ALARM` the alarms are inexact, which is fine for meals; don't add that permission, Play restricts it.
- The Android small icon is `adaptive-icon-monochrome.png`, generated into `drawable-*/notification_icon.png` at prebuild.

## Native projects, config, and env

- `ios/` and `android/` are gitignored prebuild output. Native edits there are lost and never reach teammates. Change `app.json` or a config plugin, then run `npx expo prebuild --clean`.
- The two app identifiers differ on purpose: iOS `com.forvuno.eativio`, Android `com.forvuno.eativio`. Android forbids hyphens. Do not "align" them; changing either creates a new app identity.
- `EXPO_PUBLIC_*` values are inlined at bundle time, so use static `process.env.EXPO_PUBLIC_X` access, never `process.env[key]`. Everything with this prefix ships in the bundle, so no secrets. New keys go in `src/types/env.d.ts`, which also gives `process` its type.
- Envs are `.env.dev`, `.env.lan` and `.env.prod`, mapped in `package.json` `config.envs` with a `monitoring` flag each. Every run and build script goes through `scripts/with-env.js`, which loads exactly one file, sets `EXPO_NO_DOTENV`, and stamps `EXPO_PUBLIC_APP_ENV`, `_ENV_FILE`, `_MONITORING`, `_BUILD_TIME` and `_GIT_COMMIT`. `src/constants/appEnv.ts` reads them.
- **Never name an env file `.env`, `.env.local`, `.env.development` or `.env.production`.** Expo CLI loads those itself, and `.env.local` beats `.env.production`: on 2026-11-08 a Release build shipped `.env.local`'s LAN HTTP URLs this way and could not reach the server. In development, `expo/virtual/env` also merges `.env`, `.env.local` and `.env.development` over `process.env`, beating dotenv-cli and ignoring `EXPO_NO_DOTENV`. `with-env.js` refuses to run while one exists.
- The network inspector follows `appEnv.monitoring`, not `__DEV__`, so `ios:release:dev` has it and prod builds never do.
- Gradle re-runs the Android bundle task only when a JS or TS file changes, so `with-env.js` rewrites `.expo/app-env.js` on every run to keep an env switch from reusing the old bundle.
- To check what a built app contains, grep its `main.jsbundle` (iOS, under DerivedData `Release-iphoneos/Eativio.app`) for the API host or `.env.` stamp.
- Refer to env keys by name. Tasks here do not need the values. There is no `eas.json` yet.

## Tooling

- `npm run lint` currently fails: ESLint 9 finds no `eslint.config.*`, and `.eslintrc.js` plus `--ext` are legacy. It does not validate anything until migrated.
- `npm run typecheck` passes cleanly since 2026-11-08, so any error comes from your change.
- `npm run web` is dead: `app.json` targets iOS and Android only, and `react-native-web` is not installed.

## Charts and animation

- The weight trend is `WeightTrendChart` (`src/features/progress/`), drawn with `react-native-svg`. It measures its width with `onLayout` and renders nothing under two entries. Single-point data crashed the old chart-kit `LineChart` (commit 7ba0a07), so keep that guard.
- `react-native-chart-kit` (still used by `ProgressDashboardScreen`) needs a numeric `width`, computed by hand from `Dimensions` minus card padding. Update it when card padding changes.
- Reanimated is installed and in `babel.config.js`, but nothing in `src` imports it, despite the README. Existing animation uses core `Animated`; match that unless the task needs Reanimated.
