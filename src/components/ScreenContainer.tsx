import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { PropsWithChildren, useContext } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme/theme';

const ALL_EDGES: Edge[] = ['top', 'right', 'bottom', 'left'];
// The tab bar already pads for the home indicator. Padding again here left an
// empty strip above it, which made the bar look raised.
const TAB_SCREEN_EDGES: Edge[] = ['top', 'right', 'left'];

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
  // Set only inside a bottom tab navigator.
  const isTabScreen = useContext(BottomTabBarHeightContext) !== undefined;

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

  return (
    <SafeAreaView edges={isTabScreen ? TAB_SCREEN_EDGES : ALL_EDGES} style={styles.safeArea}>
      {body}
    </SafeAreaView>
  );
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