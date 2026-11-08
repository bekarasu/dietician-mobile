// Which env file this bundle was built from, as stamped by scripts/with-env.js.
// All undefined when the app was started without the npm scripts.
export const appEnv = {
  name: process.env.EXPO_PUBLIC_APP_ENV,
  file: process.env.EXPO_PUBLIC_ENV_FILE,
  // Turns on the network inspector, in Release builds too. Off for prod.
  monitoring: process.env.EXPO_PUBLIC_MONITORING === 'true',
  // In a Debug build the bundle comes from Metro, so this is when Metro started.
  builtAt: process.env.EXPO_PUBLIC_BUILD_TIME,
  commit: process.env.EXPO_PUBLIC_GIT_COMMIT,
  apiUrls: [
    ['Account', process.env.EXPO_PUBLIC_ACCOUNT_API_URL],
    ['Medical', process.env.EXPO_PUBLIC_MEDICAL_API_URL],
    ['Progress', process.env.EXPO_PUBLIC_PROGRESS_API_URL],
    ['Recommendation', process.env.EXPO_PUBLIC_RECOMMENDATION_API_URL],
    ['Notification', process.env.EXPO_PUBLIC_NOTIFICATION_API_URL],
  ] as const,
};

// "dev · .env.dev · Release · 929c86f"
export function describeBuild() {
  if (!appEnv.name) {
    return `No env selected · ${__DEV__ ? 'Debug' : 'Release'}`;
  }
  return [appEnv.name, appEnv.file, __DEV__ ? 'Debug' : 'Release', appEnv.commit].filter(Boolean).join(' · ');
}
