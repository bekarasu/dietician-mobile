---
name: expo-platform-gotchas
description: Non-obvious iOS/Android, Expo SDK 58, and build behavior specific to dietician-mobile. Use before touching file uploads, FormData or fetch calls, TextInput/login/OTP/numeric forms, keyboard or safe-area layout, the tab bar, biometrics, SecureStore, env vars, app.json, native folders, charts, or running/building the app, and when something works on one platform but not the other, even if the task does not mention a platform.
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
- `WeightProgressScreen` uses a raw `TextInput` with `parseFloat`, so `72,5` becomes `72`.
- Test weight entry with an iOS device region that uses a comma.
- `Number(x) || fallback` in `OnboardingScreen` and `ProfileGoalsScreen` hides `NaN` from input like `7.2.5`.

## Layout

- **`ScreenContainer` has no keyboard handling.** Its `ScrollView` uses the default `keyboardShouldPersistTaps`, so with the keyboard open, the first tap on "Log in" only closes the keyboard. Pass `scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}` on form screens, or fix it in the component.
- `ScreenContainer` sets `bounces={false}`, so iOS pull-to-refresh needs `scrollViewProps={{ bounces: true }}`.
- `ScreenContainer` is scrollable by default. Pass `scrollable={false}` when the screen owns a scroll view. **Open:** `WeightProgressScreen` nests two vertical scroll views.
- **Open:** `WeightProgressScreen` is the only `KeyboardAvoidingView`, and it sits under a native stack header with no `keyboardVerticalOffset`. Use `useHeaderHeight()` on iOS.
- Android has `adjustResize` together with edge-to-edge. Do not assume keyboard behavior from the manifest alone; test on a device or emulator.
- `AppTabNavigator` sets a numeric `height` in `tabBarStyle`, which disables React Navigation's inset math, so it derives `height` and `paddingBottom` from `useSafeAreaInsets()`. Change them together, or the tabs collide with the iPhone home indicator and the Android 3-button bar.
- Inside the tab navigator, `ScreenContainer` drops the bottom safe-area edge, detected through `BottomTabBarHeightContext`, because the tab bar already pads for the home indicator. Padding twice left an empty strip of about 34pt above the bar, which made it look raised. Screens that build their own `SafeAreaView` inside a tab need the same `edges`.
- **Open:** the top edge has the same double inset under a native stack header. `ScreenContainer` pads for the status bar even though the header already sits below it, so pushed screens such as Plan Check-In start with a gap of about 60pt. `HeaderHeightContext` can tell a header is shown.

## Biometrics and secure storage

- `BloodTestUploadScreen` blocks access when `isEnrolledAsync()` is false, so an unenrolled simulator cannot get in. Do not comment out `checkAuth()`. Enroll instead: iOS Simulator > Features > Face ID > Enrolled; on Android, set a screen lock and fingerprint, then `adb -e emu finger touch 1`.
- Biometrics here are a client-side UI gate only. The API does not enforce them.
- `fallbackLabel` applies to iOS only.
- Face ID needs a native build. Expo Go does not support it, and `expo-dev-client` is not installed, so `npm run ios` targets Expo Go.
- iOS Keychain items survive app deletion, so reinstalling on iOS does not log the user out. Tokens in `tokenService` can outlive the install; use Log out, or erase the simulator.
- The `expo-secure-store` plugin excludes secure data from Android Auto Backup through `secure_store_*` rules. Do not replace `fullBackupContent` or `dataExtractionRules` without keeping them.

## Native projects, config, and env

- `ios/` and `android/` are gitignored prebuild output. Native edits there are lost and never reach teammates. Change `app.json` or a config plugin, then run `npx expo prebuild --clean`.
- For a native build on the project port: `npx dotenv -e .env.development -- npx expo run:ios --port 3000`.
- The two app identifiers differ on purpose: iOS `com.bekarasu.dietician-mobile`, Android `com.bekarasu.dieticianmobile`. Android forbids hyphens. Do not "align" them; changing either creates a new app identity.
- `EXPO_PUBLIC_*` values are inlined at bundle time, so use static `process.env.EXPO_PUBLIC_X` access, never `process.env[key]`. After changing env files, restart with `npm start -- --clear`. Everything with this prefix ships in the bundle, so no secrets.
- `.env` defines only `ACCOUNT` and `MEDICAL` URLs. `PROGRESS` and `RECOMMENDATION` exist only in `.env.development`, so a production bundle gets literal `undefined/progress` URLs. Add them before any production build. There is no `eas.json` yet.
- Refer to env keys by name. Tasks here do not need the values.

## Tooling

- `npm run lint` currently fails: ESLint 9 finds no `eslint.config.*`, and `.eslintrc.js` plus `--ext` are legacy. It does not validate anything until migrated.
- `npm run typecheck` currently reports exactly 11 errors, all `Cannot find name 'process'`. Any other error comes from your change.
- `npm run web` is dead: `app.json` targets iOS and Android only, and `react-native-web` is not installed.

## Charts and animation

- `WeightProgressScreen` renders `LineChart` only when `entries.length > 1`. Single-point data caused crashes (commit 7ba0a07), so keep the guard.
- `react-native-chart-kit` needs a numeric `width`, computed by hand from `Dimensions` minus card padding. Update it when card padding changes.
- Reanimated is installed and in `babel.config.js`, but nothing in `src` imports it, despite the README. Existing animation uses core `Animated`; match that unless the task needs Reanimated.
