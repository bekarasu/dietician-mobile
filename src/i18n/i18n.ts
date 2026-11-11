import { useSyncExternalStore } from 'react';

import { addTranslations as addCatalogTranslations, getCatalogRevision, lookup, TranslationTree } from './catalog';
import { addDeviceLanguageListener, readDeviceLanguage } from './deviceLanguage';
import { Language, localeTagFor } from './languages';
import type { TranslationKey } from './locales';

export type TranslationParams = Record<string, string | number | null | undefined>;

let currentLanguage: Language = readDeviceLanguage();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getLanguage(): Language {
  return currentLanguage;
}

// The locale for Intl formatting: 'tr-TR' or 'en-US'.
export function getLocaleTag(): string {
  return localeTagFor(currentLanguage);
}

// The value of the Accept-Language header on API requests. The server answers
// in Turkish for "tr" and in English otherwise.
export function getAcceptLanguage(): string {
  return currentLanguage;
}

// Reads the phone's language again, e.g. after Settings changed it.
export function syncDeviceLanguage() {
  const language = readDeviceLanguage();
  if (language !== currentLanguage) {
    currentLanguage = language;
    notify();
  }
}

export function addTranslations(language: Language, translations: TranslationTree) {
  addCatalogTranslations(language, translations);
  notify();
}

let removeDeviceListener: (() => void) | null = null;

// The phone is watched while anything is subscribed.
export function subscribeToLanguage(listener: () => void): () => void {
  listeners.add(listener);
  removeDeviceListener ??= addDeviceLanguageListener(syncDeviceLanguage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      removeDeviceListener?.();
      removeDeviceListener = null;
    }
  };
}

// Plural categories for the supported languages; both use one/other.
function pluralCategory(count: number): 'one' | 'other' {
  return count === 1 ? 'one' : 'other';
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) {
    return template;
  }
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

// The text for `key` in the current language, falling back to English and then
// to the key itself. `{{name}}` placeholders take values from `params`. With a
// numeric `count`, `key_one` or `key_other` is used when it exists.
export function t(key: TranslationKey, params?: TranslationParams): string {
  const language = currentLanguage;
  let template: string | undefined;

  if (typeof params?.count === 'number') {
    template = lookup(language, `${key}_${pluralCategory(params.count)}`) ?? lookup(language, `${key}_other`);
  }
  template ??= lookup(language, key);

  if (template === undefined) {
    if (__DEV__) {
      console.warn(`[i18n] Missing translation: ${key}`);
    }
    return key;
  }

  return interpolate(template, params);
}

// An option whose label is read each time it's shown, so lists defined once
// at module level follow the current language.
export function translatedOption<T>(value: T, labelKey: TranslationKey): { value: T; readonly label: string } {
  return {
    value,
    get label() {
      return t(labelKey);
    },
  };
}

// For keys built from data, such as `countries.${code}` or a server enum:
// the text if one exists in either language, otherwise undefined so the
// caller can show its own fallback.
export function translateIfExists(key: string, params?: TranslationParams): string | undefined {
  const template = lookup(currentLanguage, key);
  return template === undefined ? undefined : interpolate(template, params);
}

function getSnapshot() {
  return `${currentLanguage}:${getCatalogRevision()}`;
}

// Wraps a builder of texts-bearing data (page configs, option lists) so it is
// built once per language and texts revision, keeping object identity stable
// between renders.
export function memoizeForLanguage<T>(build: () => T): () => T {
  let cached: { key: string; value: T } | null = null;
  return () => {
    const key = getSnapshot();
    if (cached?.key !== key) {
      cached = { key, value: build() };
    }
    return cached.value;
  };
}

// Re-renders when the language or the texts change. Returns a key that changes
// with them, for remounting a tree whose texts were read outside render.
export function useTranslationsKey(): string {
  return useSyncExternalStore(subscribeToLanguage, getSnapshot, getSnapshot);
}

export function useLanguage(): Language {
  useTranslationsKey();
  return currentLanguage;
}
