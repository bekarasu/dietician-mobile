import { theme } from '../../theme/theme';
import { NetworkEntry, NetworkHeaders } from './networkLogStore';

export function isFailure(entry: NetworkEntry) {
  return entry.state === 'failed' || (entry.status ?? 0) >= 400;
}

export function statusLabel(entry: NetworkEntry) {
  if (entry.state === 'pending') {
    return '…';
  }
  if (entry.state === 'failed') {
    return 'ERR';
  }
  return String(entry.status);
}

export function statusColor(entry: NetworkEntry) {
  if (entry.state === 'pending') {
    return theme.colors.muted;
  }
  return isFailure(entry) ? theme.colors.danger : theme.colors.primary;
}

// "https://host/path?x=1" -> { host: "host", path: "/path?x=1" }
export function splitUrl(url: string) {
  const match = /^https?:\/\/([^/?#]+)(.*)$/i.exec(url);
  return match ? { host: match[1], path: match[2] || '/' } : { host: '', path: url };
}

export function formatDuration(ms: number) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export function formatClock(timestamp: number) {
  const date = new Date(timestamp);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

// Pretty-prints JSON and leaves anything else (including truncated JSON) as is.
export function formatBody(body: string) {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function entryToText(entry: NetworkEntry) {
  const status =
    entry.state === 'failed' ? `Failed: ${entry.error}` : entry.state === 'pending' ? 'Pending' : String(entry.status);
  const duration = entry.durationMs != null ? ` (${formatDuration(entry.durationMs)})` : '';

  return [
    `${entry.method} ${entry.url}`,
    `Status: ${status}${duration}`,
    '',
    'Request headers',
    headersToText(entry.requestHeaders),
    '',
    'Request body',
    entry.requestBody ? formatBody(entry.requestBody) : '(none)',
    '',
    'Response headers',
    headersToText(entry.responseHeaders),
    '',
    'Response body',
    entry.responseBody ? formatBody(entry.responseBody) : '(none)',
  ].join('\n');
}

function headersToText(headers: NetworkHeaders) {
  return headers.length ? headers.map(([name, value]) => `${name}: ${value}`).join('\n') : '(none)';
}
