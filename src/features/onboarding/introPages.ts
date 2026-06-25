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

export const ONBOARDING_INTRO_PAGES: OnboardingIntroPage[] = [
  {
    id: 'plans',
    title: 'Personal plans that feel doable',
    subtitle: 'Set up a dietician flow that fits your day with quick intake and adaptive meal ideas.',
    bullets: [
      'AI assisted meal ideas tuned to your goal',
      'Inventory nudges that reduce waste',
      'Portion cues you can adjust anytime',
    ],
    imageUri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f957.png',
    accent: '#DFF5F1',
    accentSoft: '#C6EEE7',
    highlights: [
      { label: 'Plan window', value: '7 days' },
      { label: 'Prep time', value: '15 min' },
    ],
  },
  {
    id: 'habits',
    title: 'Hydration and habit nudges',
    subtitle: 'Gentle prompts keep water, coffee, and consistency in view without noise.',
    bullets: [
      'Hydration targets and streaks',
      'Coffee caps that respect your routine',
      'Daily check ins that stay light',
    ],
    imageUri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4a7.png',
    accent: '#E0F2FE',
    accentSoft: '#C7E8FD',
    highlights: [
      { label: 'Water target', value: '2.4 L' },
      { label: 'Coffee cap', value: '3 cups' },
    ],
  },
  {
    id: 'progress',
    title: 'Progress you can trust',
    subtitle: 'Weekly signals and coaching notes turn logs into steady momentum.',
    bullets: [
      'Trend views from daily logs',
      'Guided reflections for the week',
      'Milestones that celebrate consistency',
    ],
    imageUri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c8.png',
    accent: '#FDE7D9',
    accentSoft: '#FAD3BB',
    highlights: [
      { label: 'Weekly check in', value: 'Sunday' },
      { label: 'Consistency goal', value: '5 days' },
    ],
  },
];
