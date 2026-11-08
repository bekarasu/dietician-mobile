// Firebase is configured for iOS. Enable Android autolinking only after adding
// its google-services.json and the Firebase Android config plugins.
module.exports = {
  dependencies: {
    '@react-native-firebase/app': { platforms: { android: null } },
    '@react-native-firebase/messaging': { platforms: { android: null } },
  },
};
