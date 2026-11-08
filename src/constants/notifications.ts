import appConfig from '../../app.json';

const notifications = appConfig.expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-notifications');

// Keep runtime registration in sync with the native signing capability.
export const IOS_PUSH_ENABLED = Array.isArray(notifications)
  && typeof notifications[1] === 'object'
  && notifications[1] !== null
  && 'enableRemoteNotifications' in notifications[1]
  && notifications[1].enableRemoteNotifications === true;
