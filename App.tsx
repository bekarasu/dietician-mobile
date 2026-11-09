import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { AppProviders } from './src/app/AppProviders';
import { appEnv } from './src/constants/appEnv';
import { installNetworkLogger } from './src/features/networkInspector/installNetworkLogger';
import { isBackgroundNotificationLaunch } from './src/features/notifications/firebaseMessaging';
import { configureReminderPresentation } from './src/features/reminders/mealReminders';

configureReminderPresentation();

if (appEnv.monitoring) {
  installNetworkLogger();
}

export default function App() {
  const [isHeadless, setIsHeadless] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    void isBackgroundNotificationLaunch.then((headless) => {
      if (mounted) setIsHeadless(AppState.currentState === 'active' ? false : headless);
    });
    // iOS can wake this process silently, then bring the same process to the
    // foreground later. Mount the account UI when the user actually opens it.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setIsHeadless(false);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return isHeadless === false ? <AppProviders /> : null;
}
