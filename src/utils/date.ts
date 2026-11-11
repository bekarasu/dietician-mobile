import { getLocaleTag, t } from '../i18n';

export function formatDateLabel(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat(getLocaleTag(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

// new Date('2026-10-26') means UTC midnight, which is the previous day west of Greenwich.
function parseCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// toISOString() gives the UTC date, which is still yesterday in Turkey until 03:00.
export function toCalendarDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

export function addCalendarDays(value: string, days: number) {
  const date = parseCalendarDate(value);
  date.setDate(date.getDate() + days);

  return toCalendarDate(date);
}

export function calendarDaysBetween(from: string, to: string) {
  return Math.round((parseCalendarDate(to).getTime() - parseCalendarDate(from).getTime()) / (24 * 60 * 60 * 1000));
}

export function formatCalendarDate(value: string) {
  return new Intl.DateTimeFormat(getLocaleTag(), { weekday: 'short', month: 'short', day: 'numeric' }).format(parseCalendarDate(value));
}

export function formatWeekday(value: string) {
  return new Intl.DateTimeFormat(getLocaleTag(), { weekday: 'short' }).format(parseCalendarDate(value));
}

export function formatMonthDay(value: string) {
  return new Intl.DateTimeFormat(getLocaleTag(), { month: 'short', day: 'numeric' }).format(parseCalendarDate(value));
}

export function formatWeekRange(startDate: string, endDateExclusive: string) {
  const format = new Intl.DateTimeFormat(getLocaleTag(), { month: 'short', day: 'numeric' });
  const lastDay = parseCalendarDate(endDateExclusive);
  lastDay.setDate(lastDay.getDate() - 1);

  return `${format.format(parseCalendarDate(startDate))} – ${format.format(lastDay)}`;
}

export function formatMonth(startDate: string) {
  return new Intl.DateTimeFormat(getLocaleTag(), { month: 'long', year: 'numeric' }).format(parseCalendarDate(startDate));
}

export function formatTime(dateString: string) {
  return new Intl.DateTimeFormat(getLocaleTag(), { hour: 'numeric', minute: '2-digit' }).format(new Date(dateString));
}

export function formatDateTimeLabel(dateString: string) {
  return new Intl.DateTimeFormat(getLocaleTag(), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString));
}

// "Just now", "5m ago", "3h ago", "Yesterday", "4d ago", then the date.
export function formatRelativeTime(dateString: string, now = new Date()) {
  const date = new Date(dateString);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) {
    return t('format.relative.justNow');
  }
  if (minutes < 60) {
    return t('format.relative.minutesAgo', { count: minutes });
  }
  if (minutes < 24 * 60) {
    return t('format.relative.hoursAgo', { count: Math.floor(minutes / 60) });
  }
  const days = calendarDaysBetween(toCalendarDate(date), toCalendarDate(now));
  if (days === 1) {
    return t('format.relative.yesterday');
  }
  if (days < 7) {
    return t('format.relative.daysAgo', { count: days });
  }
  return new Intl.DateTimeFormat(getLocaleTag(), {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date);
}
