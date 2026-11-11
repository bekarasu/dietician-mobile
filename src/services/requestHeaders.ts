import { getAcceptLanguage } from '../i18n';

// Every API request names the app's language, so the server's messages (errors,
// notifications, legal texts) come back in it: "tr" or "en".
export function withLanguageHeader(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  if (!result.has('Accept-Language')) {
    result.set('Accept-Language', getAcceptLanguage());
  }
  return result;
}
