export function formatDateLabel(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat('en-US', {
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
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(parseCalendarDate(value));
}

export function formatWeekday(value: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(parseCalendarDate(value));
}

export function formatMonthDay(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parseCalendarDate(value));
}

export function formatWeekRange(startDate: string, endDateExclusive: string) {
  const format = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const lastDay = parseCalendarDate(endDateExclusive);
  lastDay.setDate(lastDay.getDate() - 1);

  return `${format.format(parseCalendarDate(startDate))} – ${format.format(lastDay)}`;
}

export function formatMonth(startDate: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(parseCalendarDate(startDate));
}

export function formatTime(dateString: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(dateString));
}

export function formatDateTimeLabel(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString));
}
