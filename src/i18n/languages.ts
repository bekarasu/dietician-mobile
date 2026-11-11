export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// Anything that isn't Turkish gets English.
export const DEFAULT_LANGUAGE: Language = 'en';

// The locale for Intl date and number formatting in each language.
const LOCALE_TAGS: Record<Language, string> = {
  en: 'en-US',
  tr: 'tr-TR',
};

export function isSupportedLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

// Maps a BCP 47 tag or POSIX identifier ("tr-TR", "tr_TR", "TR") to the app's
// language: Turkish for Turkish, English for everything else.
export function toSupportedLanguage(tag: string | null | undefined): Language {
  const base = tag?.trim().split(/[-_]/)[0]?.toLowerCase();
  return base === 'tr' ? 'tr' : DEFAULT_LANGUAGE;
}

export function localeTagFor(language: Language): string {
  return LOCALE_TAGS[language];
}
