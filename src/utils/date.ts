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

export function formatWeekRange(startDate: string, endDateExclusive: string) {
  const format = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const lastDay = parseCalendarDate(endDateExclusive);
  lastDay.setDate(lastDay.getDate() - 1);

  return `${format.format(parseCalendarDate(startDate))} – ${format.format(lastDay)}`;
}

export function formatMonth(startDate: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(parseCalendarDate(startDate));
}

export function formatDateTimeLabel(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString));
}
