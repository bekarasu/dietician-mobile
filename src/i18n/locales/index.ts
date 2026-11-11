// The texts shipped in the app, one JSON file per area and language. English
// is the source: its keys are the TranslationKey type, and Turkish must have
// every one of them (the typecheck fails otherwise). The server can later lay
// its own texts over these through addTranslations, using the same keys.
import type { Language } from '../languages';

import enCommon from './en/common.json';
import enFormat from './en/format.json';
import enOptions from './en/options.json';
import enHealth from './en/health.json';
import enComponents from './en/components.json';
import enNavigation from './en/navigation.json';
import enAuth from './en/auth.json';
import enLegal from './en/legal.json';
import enOnboarding from './en/onboarding.json';
import enProfile from './en/profile.json';
import enHome from './en/home.json';
import enDietPlan from './en/dietPlan.json';
import enSharedPlan from './en/sharedPlan.json';
import enFriends from './en/friends.json';
import enLeaderboard from './en/leaderboard.json';
import enProgress from './en/progress.json';
import enHydration from './en/hydration.json';
import enNotifications from './en/notifications.json';
import enReminders from './en/reminders.json';
import enBloodTest from './en/bloodTest.json';
import enInventory from './en/inventory.json';
import enRecommendation from './en/recommendation.json';
import trCommon from './tr/common.json';
import trFormat from './tr/format.json';
import trOptions from './tr/options.json';
import trHealth from './tr/health.json';
import trComponents from './tr/components.json';
import trNavigation from './tr/navigation.json';
import trAuth from './tr/auth.json';
import trLegal from './tr/legal.json';
import trOnboarding from './tr/onboarding.json';
import trProfile from './tr/profile.json';
import trHome from './tr/home.json';
import trDietPlan from './tr/dietPlan.json';
import trSharedPlan from './tr/sharedPlan.json';
import trFriends from './tr/friends.json';
import trLeaderboard from './tr/leaderboard.json';
import trProgress from './tr/progress.json';
import trHydration from './tr/hydration.json';
import trNotifications from './tr/notifications.json';
import trReminders from './tr/reminders.json';
import trBloodTest from './tr/bloodTest.json';
import trInventory from './tr/inventory.json';
import trRecommendation from './tr/recommendation.json';
import trCountries from './tr/countries.json';

export const en = {
  common: enCommon,
  format: enFormat,
  options: enOptions,
  health: enHealth,
  components: enComponents,
  navigation: enNavigation,
  auth: enAuth,
  legal: enLegal,
  onboarding: enOnboarding,
  profile: enProfile,
  home: enHome,
  dietPlan: enDietPlan,
  sharedPlan: enSharedPlan,
  friends: enFriends,
  leaderboard: enLeaderboard,
  progress: enProgress,
  hydration: enHydration,
  notifications: enNotifications,
  reminders: enReminders,
  bloodTest: enBloodTest,
  inventory: enInventory,
  recommendation: enRecommendation,
};

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

const tr: Shape<typeof en> = {
  common: trCommon,
  format: trFormat,
  options: trOptions,
  health: trHealth,
  components: trComponents,
  navigation: trNavigation,
  auth: trAuth,
  legal: trLegal,
  onboarding: trOnboarding,
  profile: trProfile,
  home: trHome,
  dietPlan: trDietPlan,
  sharedPlan: trSharedPlan,
  friends: trFriends,
  leaderboard: trLeaderboard,
  progress: trProgress,
  hydration: trHydration,
  notifications: trNotifications,
  reminders: trReminders,
  bloodTest: trBloodTest,
  inventory: trInventory,
  recommendation: trRecommendation,
};

// Country names in English come from src/constants/countries.ts.
export const bundledTranslations: Record<Language, object> = {
  en,
  tr: { ...tr, countries: trCountries },
};

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

type AllKeys = Leaves<typeof en>;

// `key_one` / `key_other` are also reachable as `key` with a count.
type PluralBase<K> = K extends `${infer Base}_one` ? Base : K extends `${infer Base}_other` ? Base : never;

export type TranslationKey = AllKeys | PluralBase<AllKeys>;
