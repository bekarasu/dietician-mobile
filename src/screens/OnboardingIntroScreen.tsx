import { useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { ONBOARDING_INTRO_PAGES } from '../features/onboarding/introPages';
import { useAuthStore } from '../store/useAuthStore';
import { theme } from '../theme/theme';

import type { AuthStackParamList } from '../navigation/navigationTypes';

const SCROLL_EVENT_THROTTLE = 16;

type Props = NativeStackScreenProps<AuthStackParamList, 'OnboardingIntro'>;

export function OnboardingIntroScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSkip = () => {
    useAuthStore.getState().setHasSeenOnboardingIntro();
    navigation.replace('Welcome');
  };

  const handleNext = () => {
    if (currentIndex === ONBOARDING_INTRO_PAGES.length - 1) {
      useAuthStore.getState().setHasSeenOnboardingIntro();
      navigation.replace('Welcome');
      return;
    }

    scrollRef.current?.scrollTo({ x: width * (currentIndex + 1), animated: true });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={SCROLL_EVENT_THROTTLE}
          onMomentumScrollEnd={(event) => {
            const safeWidth = width > 0 ? width : 390;
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / safeWidth);
            setCurrentIndex(nextIndex);
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
        >
          {ONBOARDING_INTRO_PAGES.map((page, index) => {
            const safeWidth = width > 0 ? width : 390;
            const inputRange = [(index - 1) * safeWidth, index * safeWidth, (index + 1) * safeWidth];
            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [18, 0, 18],
            });
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.96, 1, 0.96],
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.6, 1, 0.6],
            });

            return (
              <View key={page.id} style={[styles.page, { width: safeWidth }]}>
                <View pointerEvents="none" style={[styles.pageGlow, { backgroundColor: page.accentSoft }]} />

                <Animated.View
                  style={[
                    styles.illustrationCard,
                    {
                      backgroundColor: page.accent,
                      opacity,
                      transform: [{ translateY }, { scale }],
                    },
                  ]}
                >
                  <View style={[styles.haloLarge, { backgroundColor: page.accentSoft }]} />
                  <View style={styles.haloSmall} />
                  <Image source={{ uri: page.imageUri }} style={styles.illustrationImage} />
                </Animated.View>

                <View style={styles.copy}>
                  <Text style={styles.kicker}>Dietician onboarding</Text>
                  <Text style={styles.title}>{page.title}</Text>
                  <Text style={styles.subtitle}>{page.subtitle}</Text>
                </View>

                <View style={styles.bullets}>
                  {page.bullets.map((bullet) => (
                    <View key={`${page.id}-${bullet}`} style={styles.bulletRow}>
                      <View style={[styles.bulletDot, { backgroundColor: theme.colors.primary }]} />
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.highlights}>
                  {page.highlights.map((highlight) => (
                    <View key={`${page.id}-${highlight.label}`} style={styles.highlightCard}>
                      <Text style={styles.highlightValue}>{highlight.value}</Text>
                      <Text style={styles.highlightLabel}>{highlight.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </Animated.ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {ONBOARDING_INTRO_PAGES.map((page, index) => {
              const safeWidth = width > 0 ? width : 390;
              const inputRange = [(index - 1) * safeWidth, index * safeWidth, (index + 1) * safeWidth];
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [1, 1.6, 1],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.35, 1, 0.35],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={page.id}
                  style={[
                    styles.dot,
                    {
                      opacity,
                      transform: [{ scale }],
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.actions}>
            <AppButton title="Skip" onPress={handleSkip} variant="ghost" />
            <AppButton
              title={currentIndex === ONBOARDING_INTRO_PAGES.length - 1 ? 'Continue' : 'Next'}
              onPress={handleNext}
              style={styles.primaryAction}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'stretch',
  },
  pageGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -60,
    right: -40,
    opacity: 0.5,
  },
  illustrationCard: {
    height: 230,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  haloLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    opacity: 0.7,
  },
  haloSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    opacity: 0.85,
  },
  illustrationImage: {
    width: 120,
    height: 120,
  },
  copy: {
    gap: theme.spacing.sm,
  },
  kicker: {
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
    lineHeight: 32,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
    lineHeight: 24,
  },
  bullets: {
    gap: theme.spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  bulletText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    lineHeight: 22,
    flex: 1,
  },
  highlights: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  highlightValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
  },
  highlightLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    marginTop: theme.spacing.xs,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  primaryAction: {
    flex: 1,
  },
});
