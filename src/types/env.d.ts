// Expo inlines EXPO_PUBLIC_* by name at bundle time, so only static
// `process.env.EXPO_PUBLIC_X` reads work. scripts/with-env.js sets them from
// the env file picked in package.json "config.envs".
declare const process: {
  env: {
    readonly EXPO_PUBLIC_ACCOUNT_API_URL?: string;
    readonly EXPO_PUBLIC_MEDICAL_API_URL?: string;
    readonly EXPO_PUBLIC_PROGRESS_API_URL?: string;
    readonly EXPO_PUBLIC_RECOMMENDATION_API_URL?: string;
    // Set by scripts/with-env.js, not by the env files.
    readonly EXPO_PUBLIC_APP_ENV?: string;
    readonly EXPO_PUBLIC_ENV_FILE?: string;
    readonly EXPO_PUBLIC_MONITORING?: string;
    readonly EXPO_PUBLIC_BUILD_TIME?: string;
    readonly EXPO_PUBLIC_GIT_COMMIT?: string;
  };
};
