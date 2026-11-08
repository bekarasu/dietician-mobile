# Dietician Mobile

A mobile application built with React Native and Expo.

## Features & Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Zustand
- **Navigation**: React Navigation (Native Stack & Bottom Tabs)
- **Forms**: React Hook Form
- **Storage**: Expo Secure Store
- **Styling & Animations**: React Native Reanimated

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Xcode or Android Studio for native builds

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Environments

Each env is one file, listed in `package.json` under `config.envs`:

| Env | File | Network inspector |
| --- | --- | --- |
| `dev` | `.env.dev` | on |
| `lan` | `.env.lan` (backend on your Mac, over Wi-Fi) | on |
| `prod` | `.env.prod` | off |

Create the files from `.env.example`. Every script prints the env, the file and the API URLs before it runs, and the app shows them at the bottom of the Profile screen and in the network inspector. `EXPO_PUBLIC_NOTIFICATION_API_URL` points at notification-service's API process (port 8087 locally), not its worker.

Do not name a file `.env`, `.env.local`, `.env.development` or `.env.production`. Expo merges those in on its own, so the scripts refuse to run while one exists.

### Running the App

| Script | What it does |
| --- | --- |
| `npm start` / `start:lan` / `start:prod` | Metro only, for a debug build that is already installed. Switching env needs only a restart of Metro. |
| `npm run ios` / `ios:lan` | Debug build on the iOS simulator, with Metro |
| `npm run ios:device` | Debug build on an iPhone, with Metro (`dev`) |
| `npm run ios:release` | Release build on an iPhone, `prod`, no Metro needed |
| `npm run ios:release:dev` | Release build on an iPhone against `dev`, with the network inspector |
| `npm run android` / `android:lan` | Debug build on an emulator or connected phone, with Metro |
| `npm run android:release` / `android:release:dev` | Release build, `prod` or `dev` |
| `npm run env:check` | Checks every env file for missing or invalid URLs |

Extra flags pass through, for example `npm run ios:lan -- --device`.

Release builds need HTTPS. Android release refuses plain HTTP, so `lan` is for debug builds.

### Other scripts

- `npm run typecheck`: Runs TypeScript compiler check without emitting files
- `npm run test:push`: Checks push registration, token refresh, logout races, opt-out, permission changes and notification destinations
- `npm run lint`: Runs ESLint for code formatting and quality

### Notifications

notification-service keeps every notification sent to the user, and the app reads them from its API (`src/services/notificationService.ts`); no other service or the app stores them. The bell next to the avatar on Today opens **Notifications**, newest first, with a badge for the unread count (`useNotificationStore`).

- The badge reads `GET /notifications/unread-count` when Today is focused, when the app returns to the foreground, every minute while Today is open, and when a push arrives in the foreground. Nothing else tells the app a notification arrived, so this works with push off.
- Opening a notification marks it read and opens the same screen as its push (`openNotification`, the table below). Opening a push marks its notification read too, through the `notificationId` every push carries.
- The list pages with the server's `nextCursor`, loads once per visit, and refreshes on pull. **Mark all read** is in the header.
- Titles and bodies come from the server, rendered in the request's language (English, as the app sends no `Accept-Language`).
- Logout resets the badge, so the next user never sees the previous user's count.

### iOS push notifications (FCM)

The iOS app uses `@react-native-firebase/app` and `@react-native-firebase/messaging`, wrapping the native Firebase Apple SDK. `GoogleService-Info.plist` belongs to Firebase project `eativio-73ea5` and bundle ID `com.forvuno.eativio`. It is client configuration; never put a Firebase Admin service account key or an APNs `.p8` key in this app.

Remote push is **off by default** so the app can be signed with a free Apple Personal Team. Local meal reminders still work. Apple requires an Apple Developer Program membership (or access to an enrolled team) for the iOS Push Notifications capability. The FCM integration stays in the project, but does not register with APNs/FCM or show its settings entry while remote push is disabled.

The single switch is the `expo-notifications` plugin's **`enableRemoteNotifications`** option in `app.json`. Once an enrolled team is available, set it to `true` and run `npm run ios:device`. `plugins/withFirebaseIos.js` manages the `remote-notification` background mode with the same switch and removes old push entitlements/capability metadata when switching back to `false`, including on incremental prebuilds. Do not enable push while signing with a free Personal Team.

Firebase 27 uses Swift Package Manager for the Apple SDK and needs dynamic frameworks, configured through `expo-build-properties`. Native folders are generated; keep changes in `app.json`, `firebase.json` and `plugins/withFirebaseIos.js`.

Before testing delivery:

1. Join the Apple Developer Program or an enrolled team's development account, select that team in `ios.appleTeamId`, and enable **Push Notifications** for `com.forvuno.eativio` in the Apple Developer portal. Regenerate the provisioning profile if it predates this capability. Set `enableRemoteNotifications` to `true` in `app.json`.
2. In Firebase project **eativio-73ea5**, open **Project settings → Cloud Messaging → Apple app configuration** and upload the APNs authentication key for that team, if it has not already been configured.
3. Build a new native app on a physical iPhone: `npm run ios:device`. Expo Go and the native build from before this change do not include the Firebase modules.
4. Log in and allow notifications. In **Profile → Push notifications**, the phone should show that it is ready. In `dev` and `lan`, this screen also exposes the FCM token for a Firebase Console test message. Put the app in the background and send the test to that token, then repeat with the app open and after a cold launch.

After bootstrap/login, the app sends the **FCM registration token** to account-service with `PUT /devices` and `{ token, platform: 'ios' }`, using the existing authenticated API client. It re-registers on foreground and token refresh, and retries failed registration on the next foreground or **Try again**. Notification permission is checked on every sync. **Push notifications** is a per-device preference stored in SecureStore; turning it off removes this device and revokes its FCM token. Logout stops listeners, drains any in-flight registration, removes the device and revokes the token before ending the authenticated session. The backend logout also invalidates all devices for that account.

Notification taps wait until the signed-in app navigator is available, including when onboarding or resumed generation is open:

| FCM `data.type` | Opens |
| --- | --- |
| `friendship.request_received`, `friendship.request_accepted` | Friends |
| `sharedplan.invite_received`, `sharedplan.invite_accepted` | Shared Meals |
| `score.weekly_result`, `score.monthly_result` | Leaderboard, on the period and ranking (`scope`) the notification was about |
| `dietplan.ready` | Diet Plan; also refreshes the active plan |
| Other types or a Firebase Console test without data | Today |

iOS presents the original push in foreground and background; the app does not schedule a duplicate. Local meal reminders keep their existing schedules and stay silent in the foreground. A silent background launch acknowledges FCM messages without mounting the account UI, then mounts it when the app becomes active.

Backend delivery also requires notification-service's Firebase Admin credentials for the same Firebase project and the relevant event/channel switches. See the backend's `docs/notifications.md`; this mobile change does not configure the deployed server.

Android FCM is intentionally disabled in the config plugin and native autolinking. Its existing local notifications keep working. To add Android push later, supply the Firebase project's `google-services.json`, enable the standard Firebase plugins for Android, remove the Android exclusions in `react-native.config.js`, and add its permission/channel/presentation handling in the push service.

References: [Apple account and Personal Team limitations](https://developer.apple.com/help/account/basics/about-your-developer-account), [Supported iOS capabilities by membership](https://developer.apple.com/help/account/reference/supported-capabilities-ios/), [React Native Firebase Expo setup](https://rnfirebase.io/#installation-for-expo-projects), [Firebase Apple FCM setup and test delivery](https://firebase.google.com/docs/cloud-messaging/ios/get-started).

## License

This project is proprietary and confidential.
