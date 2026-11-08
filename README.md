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

Create the files from `.env.example`. Every script prints the env, the file and the API URLs before it runs, and the app shows them at the bottom of the Profile screen and in the network inspector.

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
- `npm run lint`: Runs ESLint for code formatting and quality

## License

This project is proprietary and confidential.
