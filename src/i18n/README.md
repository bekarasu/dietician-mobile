# Translations

The app is in English and Turkish. Texts live in the app, in one JSON file per area and language under `locales/en` and `locales/tr`. The structure is ready for the server to supply texts later.

## Language

- Read from the phone (`deviceLanguage.ts`, through expo-localization): Turkish when the phone's first language is Turkish, English for everything else. iOS and Android 13+ also offer a per-app language in the system Settings, which counts as the phone's language.
- There is no in-app switch. When the system language changes, Android keeps the app running and the navigation tree remounts in the new language (`AppProviders`); iOS restarts the app.
- Every API request sends `Accept-Language: tr` or `en` (`services/requestHeaders.ts`), so server errors, notification texts, legal documents, plan content (meal names, preparations, ingredients, goals) and food names come back in the same language. Plans are kept in English on the server and translated for each request. Pushes follow it too, from the language sent when the phone last registered. Data from the server is never translated here; see dietician-api-contracts.
- Dates and numbers use `getLocaleTag()` (`tr-TR` or `en-US`): use `formatDecimal`, `formatKg`, `formatPercent` and the helpers in `utils/date.ts`, not `toFixed` or a hard-coded `'en-US'`.

## Adding a text

1. Add the key to the area's file in `locales/en`, and the same key to `locales/tr`. A key missing from Turkish fails `npm run typecheck`; `npm run i18n:check` also catches extra keys and mismatched placeholders.
2. Use it with `t('area.key')`, or `t('area.key', { name })` for `{{name}}` placeholders.
3. Plurals: add `key_one` and `key_other`, then call `t('area.key', { count })`. Turkish nouns don't change after a number, so both Turkish forms are usually the same.
4. Keys built from data (`countries.DE`, a server enum) go through `translateIfExists(key) ?? fallback`.

Don't call `t()` at module level, since the language can change and server texts can arrive later. For lists defined once, use `translatedOption(value, key)`, a function, or `memoizeForLanguage(() => …)`.

## Connecting the server later

`catalog.ts` holds the texts in use. Texts from elsewhere are laid over the bundled ones key by key:

```ts
import { getLanguage, loadTranslations, TranslationSource } from '../i18n';

const serverSource: TranslationSource = {
  async load(language) {
    const response = await fetch(`${API_URL}/translations/${language}`);
    return response.ok ? response.json() : null; // nested or dot-separated keys
  },
};

await loadTranslations(serverSource, getLanguage());
```

- Keys the server leaves out keep the app's text, and a failed load keeps everything as it is, so an outage never blanks the UI.
- Load them during startup (`useAppBootstrap`) before the screens mount. A later load also works, but it remounts the navigation tree.
- The server can serve these JSON files as they are: same keys, `{{placeholder}}` syntax and `_one`/`_other` plurals (i18next style).
