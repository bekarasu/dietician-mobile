import { PropsWithChildren } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme/theme';

interface ScreenContainerProps extends PropsWithChildren {
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: ScrollViewProps;
}

export function ScreenContainer({
  children,
  scrollable = true,
  contentStyle,
  scrollViewProps,
}: ScreenContainerProps) {
  const body = scrollable ? (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  return <SafeAreaView style={styles.safeArea}>{body}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
});