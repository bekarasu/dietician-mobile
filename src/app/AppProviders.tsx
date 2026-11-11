import { ActivityIndicator, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { appEnv } from '../constants/appEnv';
import { DialogHost } from '../features/dialog/DialogHost';
import { NetworkInspector } from '../features/networkInspector/NetworkInspector';
import { usePushNotificationRegistration } from '../features/notifications/usePushNotifications';
import { useAppBootstrap } from '../hooks/useAppBootstrap';
import { useTranslationsKey } from '../i18n';
import { RootNavigator } from '../navigation/RootNavigator';
import { theme } from '../theme/theme';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    border: theme.colors.border,
    primary: theme.colors.primary,
    text: theme.colors.text,
  },
};

export function AppProviders() {
  const isReady = useAppBootstrap();
  // Screens read their texts while rendering and in navigator options, so the
  // whole navigation tree remounts when the phone's language changes.
  const translationsKey = useTranslationsKey();
  usePushNotificationRegistration(isReady);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {isReady ? (
          <NavigationContainer key={translationsKey} theme={navigationTheme}>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.background,
            }}
          >
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        )}
        {/* Mounted outside the branch so it stays open across bootstrap and
            can show the startup requests while the spinner is up. */}
        {appEnv.monitoring ? <NetworkInspector /> : null}
        {/* Outside the navigators, so a dialog can finish closing when its
            action swaps them, as logging out does. */}
        <DialogHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
