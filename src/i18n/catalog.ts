import { DEFAULT_LANGUAGE, Language, SUPPORTED_LANGUAGES } from './languages';
import { bundledTranslations } from './locales';

// Translations as nested objects ({ auth: { login: { title: '…' } } }) or with
// dot-separated keys ({ 'auth.login.title': '…' }); both mean the same.
export interface TranslationTree {
  [key: string]: string | TranslationTree;
}

type FlatTranslations = Map<string, string>;

function flatten(tree: TranslationTree, prefix = '', into: FlatTranslations = new Map()): FlatTranslations {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      into.set(path, value);
    } else if (value && typeof value === 'object') {
      flatten(value, path, into);
    }
  }
  return into;
}

// The texts in use, per language. They start as the ones shipped in the app,
// and addTranslations lays others over them key by key.
const catalog = new Map<Language, FlatTranslations>(
  SUPPORTED_LANGUAGES.map((language) => [language, flatten(bundledTranslations[language] as unknown as TranslationTree)]),
);

let revision = 0;

export function lookup(language: Language, key: string): string | undefined {
  return catalog.get(language)?.get(key) ?? (language === DEFAULT_LANGUAGE ? undefined : catalog.get(DEFAULT_LANGUAGE)?.get(key));
}

// Overrides texts for one language, such as ones downloaded from the server.
// Keys it doesn't name keep their current text, and unknown keys are kept too,
// so a newer server can add texts an older app ignores.
export function addTranslations(language: Language, translations: TranslationTree) {
  const current = catalog.get(language) ?? new Map();
  for (const [key, value] of flatten(translations)) {
    if (value.trim()) {
      current.set(key, value);
    }
  }
  catalog.set(language, current);
  revision += 1;
}

// Changes whenever addTranslations does, so the UI can tell it needs redrawing.
export function getCatalogRevision() {
  return revision;
}

// Where translations can come from besides the app itself. The server will be
// one: load returns its texts for a language, or null to keep what the app has.
export interface TranslationSource {
  load(language: Language): Promise<TranslationTree | null>;
}

// Lays a source's texts for `language` over the current ones. Failures keep
// the app's own texts, so a server outage never blanks the UI.
export async function loadTranslations(source: TranslationSource, language: Language): Promise<boolean> {
  try {
    const translations = await source.load(language);
    if (!translations) {
      return false;
    }
    addTranslations(language, translations);
    return true;
  } catch {
    return false;
  }
}
