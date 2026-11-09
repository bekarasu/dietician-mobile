const { withEntitlementsPlist, withInfoPlist, withPlugins, withXcodeProject } = require('@expo/config-plugins');

// Only iOS credentials are available. Keep Android prebuild working without
// applying Firebase's Google Services Gradle plugin or requiring a JSON file.
module.exports = function withFirebaseIos(config) {
  const notifications = config.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-notifications');
  const pushEnabled = notifications?.[1]?.enableRemoteNotifications === true;
  const androidMods = config.mods?.android ? { ...config.mods.android } : undefined;
  config = withPlugins(config, ['@react-native-firebase/app', '@react-native-firebase/messaging']);
  if (androidMods) {
    config.mods.android = androidMods;
  } else {
    delete config.mods.android;
  }
  // Expo preserves existing native entitlements during incremental prebuild.
  // Remove an earlier push entitlement when building with a free Personal Team.
  config = withEntitlementsPlist(config, (mod) => {
    if (!pushEnabled) delete mod.modResults['aps-environment'];
    return mod;
  });
  config = withInfoPlist(config, (mod) => {
    const modes = (mod.modResults.UIBackgroundModes ?? []).filter((mode) => mode !== 'remote-notification');
    if (pushEnabled) modes.push('remote-notification');
    if (modes.length) {
      mod.modResults.UIBackgroundModes = modes;
    } else {
      delete mod.modResults.UIBackgroundModes;
    }
    return mod;
  });
  return withXcodeProject(config, (mod) => {
    if (!pushEnabled) {
      const attributes = mod.modResults.getFirstProject().firstProject.attributes.TargetAttributes ?? {};
      for (const target of Object.values(attributes)) {
        if (target.SystemCapabilities) delete target.SystemCapabilities['com.apple.Push'];
      }
    }
    return mod;
  });
};
