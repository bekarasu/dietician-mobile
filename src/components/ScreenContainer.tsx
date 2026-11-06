import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { HeaderShownContext } from '@react-navigation/elements';
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
  const isHeaderShown = useContext(HeaderShownContext);
  // The tab bar already pads for the home indicator, and a stack header already
  // sits below the status bar. Padding again left an empty strip beside them.
  const edges = ALL_EDGES.filter(
    (edge) => !(edge === 'bottom' && isTabScreen) && !(edge === 'top' && isHeaderShown),
  );

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
    <SafeAreaView edges={edges} style={styles.safeArea}>
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