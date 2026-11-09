import type * as MessagingModule from '@react-native-firebase/messaging';
import { Platform, TurboModuleRegistry } from 'react-native';

import { IOS_PUSH_ENABLED } from '../../constants/notifications';

// Old native builds and Expo Go have no Firebase modules. They can still open
// the app while the settings screen explains that a new native build is needed.
function loadMessaging(): typeof MessagingModule | null {
  if (!IOS_PUSH_ENABLED || Platform.OS !== 'ios' || !TurboModuleRegistry.get('NativeRNFBTurboApp')) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const api: typeof MessagingModule = require('@react-native-firebase/messaging');
    api.getMessaging();
    return api;
  } catch (error) {
    console.warn('Firebase Messaging is unavailable', error);
    return null;
  }
}

export const firebaseMessaging = loadMessaging();

if (firebaseMessaging) {
  // Notification payloads are displayed by iOS in the background. Acknowledge
  // them without scheduling a duplicate or mounting any account UI.
  firebaseMessaging.setBackgroundMessageHandler(firebaseMessaging.getMessaging(), async () => undefined);
}

export const isBackgroundNotificationLaunch = firebaseMessaging
  ? firebaseMessaging.getIsHeadless(firebaseMessaging.getMessaging()).catch(() => false)
  : Promise.resolve(false);
