# Dietician Mobile Boilerplate

Expo-based React Native boilerplate for an AI-assisted personal dietitian application. The scaffold is intentionally focused on structure, typed domain models, reusable UI primitives, and clear extension points for backend and AI integration.

## Why Expo

Expo is the right default here because the project is mobile-first, TypeScript-friendly, and currently relies on standard navigation, forms, and local mock data instead of custom native SDKs. It keeps iOS and Android setup lighter while leaving room to eject later if the production app needs native health integrations or platform-specific modules.

## Stack

- React Native with Expo
- TypeScript
- React Navigation
- Zustand
- React Hook Form
- Local mock data and placeholder services

## Run The Project

1. Install dependencies:

```bash
npm install
```

2. Start Expo:

```bash
npm start
```

3. Run platform targets when native tooling is available:

```bash
npm run ios
npm run android
```

4. Validate types:

```bash
npm run typecheck
```

## Folder Structure

```txt
src/
  app/
  assets/
  components/
  constants/
  features/
  hooks/
  navigation/
  screens/
  services/
    mocks/
  store/
  theme/
  types/
  utils/
```

## Architecture Notes

- `src/app` contains app-level providers and bootstrapping.
- `src/navigation` separates auth flow from the main authenticated stack and bottom tabs.
- `src/screens` owns route-level composition only; reusable UI and feature-specific helpers live elsewhere.
- `src/components` contains shared UI primitives such as `AppButton`, `AppTextInput`, `AppCard`, and `ScreenContainer`.
- `src/features/onboarding/onboardingPages.ts` is the config-driven source of truth for onboarding steps. Add or remove pages there without rewriting the flow controller.
- `src/store` uses small Zustand stores for auth, profile, daily logs, inventory, hydration, and progress.
- `src/services` is the integration boundary. Services currently return mock data or placeholder responses and are safe to swap for backend calls later.
- `src/types/models.ts` centralizes shared domain types.
- `src/constants/health.ts` keeps the medical and AI guidance boundaries explicit in one place.

## Included Flows

- Auth: welcome, login, register
- Main navigation: dashboard, food log, meal recommendation, progress, profile/goals
- Additional screens: refrigerator inventory, water and coffee tracking, friend competition, blood test upload, settings

## Health Boundaries Included In The Boilerplate

- Blood test upload UI includes a medical disclaimer.
- Recommendation copy avoids aggressive restriction language.
- Comments in service files call out the need for secure health-data handling, clinician boundaries, and backend-side safety controls.
- AI suggestions are framed as general nutrition guidance rather than diagnosis.

## Future Backend Integration

1. Replace mock services in `src/services` with API clients.
2. Keep the screen layer unchanged and move data loading into store actions or dedicated query hooks.
3. Add authenticated persistence for profile, logs, inventory, hydration, progress, and uploads.
4. Move AI recommendation generation to a backend service that applies prompt controls, audit logging, and health-safety policies.

## Future AI Integration

The current recommendation service is deliberately simple. It already accepts structured context including goal type, dietary preferences, daily logs, inventory, progress, hydration, and coffee intake. That shape is meant to become the payload for a backend recommendation endpoint or an orchestrated AI provider.

## Notes For Production Hardening

- Add secure storage and token handling.
- Add analytics and crash reporting.
- Add consent flows for sensitive health data.
- Add validation, retry handling, and offline sync.
- Add tests for store actions, services, and route flows.