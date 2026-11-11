import { requireOptionalNativeModule } from 'expo';
import { AppState, I18nManager, Platform, Settings } from 'react-native';

import { Language, toSupportedLanguage } from './languages';

interface LocalizationModule {
  getLocales(): { languageTag: string; languageCode: string | null }[];
  addListener(eventName: 'onLocaleSettingsChanged', listener: () => void): { remove(): void };
}

// expo-localization's own entry point throws on import in a native build made
// before it was added, so the module is looked up here and may be missing.
const localization = requireOptionalNativeModule<LocalizationModule>('ExpoLocalization');

// The phone's first preferred language, which on iOS and Android 13+ is the
// per-app language when the user picked one in Settings.
function readPreferredLocaleTag(): string | undefined {
  try {
    const first = localization?.getLocales()[0];
    if (first) {
      return first.languageCode ?? first.languageTag;
    }
  } catch {
    // Fall through to what React Native knows.
  }

  try {
    if (Platform.OS === 'ios') {
      const appleLanguages = Settings.get('AppleLanguages') as string[] | undefined;
      if (appleLanguages?.[0]) {
        return appleLanguages[0];
      }
    }
    const identifier = I18nManager.getConstants?.().localeIdentifier;
    if (identifier) {
      return identifier;
    }
  } catch {
    // Fall through to Intl.
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

export function readDeviceLanguage(): Language {
  return toSupportedLanguage(readPreferredLocaleTag());
}

// Calls `listener` when the language may have changed: on Android's settings
// event (iOS restarts the app instead) and whenever the app comes back to the
// foreground, which also covers builds without expo-localization.
export function addDeviceLanguageListener(listener: () => void): () => void {
  const settingsSubscription = localization?.addListener('onLocaleSettingsChanged', listener);
  const appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      listener();
    }
  });
  return () => {
    settingsSubscription?.remove();
    appStateSubscription.remove();
  };
}
