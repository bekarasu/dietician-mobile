import { memoizeForLanguage, t } from '../../i18n';

export interface OnboardingIntroHighlight {
  label: string;
  value: string;
}

export interface OnboardingIntroPage {
  id: string;
  title: string;
  subtitle: string;
  bullets: string[];
  imageUri: string;
  accent: string;
  accentSoft: string;
  highlights: OnboardingIntroHighlight[];
}

// Built in the current language when first read after a language change.
export const getOnboardingIntroPages = memoizeForLanguage((): OnboardingIntroPage[] => [
  {
    id: 'plans',
    title: t('onboarding.intro.plans.title'),
    subtitle: t('onboarding.intro.plans.subtitle'),
    bullets: [t('onboarding.intro.plans.bullet1'), t('onboarding.intro.plans.bullet2'), t('onboarding.intro.plans.bullet3')],
    imageUri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f957.png',
    accent: '#DFF5F1',
    accentSoft: '#C6EEE7',
    highlights: [
      { label: t('onboarding.intro.plans.highlight1Label'), value: t('onboarding.intro.plans.highlight1Value') },
      { label: t('onboarding.intro.plans.highlight2Label'), value: t('onboarding.intro.plans.highlight2Value') },
    ],
  },
  {
    id: 'habits',
    title: t('onboarding.intro.habits.title'),
    subtitle: t('onboarding.intro.habits.subtitle'),
    bullets: [t('onboarding.intro.habits.bullet1'), t('onboarding.intro.habits.bullet2'), t('onboarding.intro.habits.bullet3')],
    imageUri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4a7.png',
    accent: '#E0F2FE',
    accentSoft: '#C7E8FD',
    highlights: [
      { label: t('onboarding.intro.habits.highlight1Label'), value: t('onboarding.intro.habits.highlight1Value') },
      { label: t('onboarding.intro.habits.highlight2Label'), value: t('onboarding.intro.habits.highlight2Value') },
    ],
  },
  {
    id: 'progress',
    title: t('onboarding.intro.progress.title'),
    subtitle: t('onboarding.intro.progress.subtitle'),
    bullets: [t('onboarding.intro.progress.bullet1'), t('onboarding.intro.progress.bullet2'), t('onboarding.intro.progress.bullet3')],
    imageUri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c8.png',
    accent: '#FDE7D9',
    accentSoft: '#FAD3BB',
    highlights: [
      { label: t('onboarding.intro.progress.highlight1Label'), value: t('onboarding.intro.progress.highlight1Value') },
      { label: t('onboarding.intro.progress.highlight2Label'), value: t('onboarding.intro.progress.highlight2Value') },
    ],
  },
]);
