const { withPlugins } = require('@expo/config-plugins');

// Only iOS credentials are available. Keep Android prebuild working without
// applying Firebase's Google Services Gradle plugin or requiring a JSON file.
module.exports = function withFirebaseIos(config) {
  const androidMods = config.mods?.android ? { ...config.mods.android } : undefined;
  config = withPlugins(config, ['@react-native-firebase/app', '@react-native-firebase/messaging']);
  if (androidMods) {
    config.mods.android = androidMods;
  } else {
    delete config.mods.android;
  }
  return config;
};
