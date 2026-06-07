/** Human-friendly date/time formatting helpers. */

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const birthdayFmt = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * Parse an ISO string to a Date. Date-only values (`YYYY-MM-DD`, e.g. birthdays) are parsed as
 * **local** time — `new Date('1986-07-01')` would otherwise be treated as UTC midnight and display
 * as the previous day for anyone behind UTC. Full timestamps (with a time component) are real
 * instants and parsed as-is.
 */
function parseDate(iso: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(iso);
}

export function formatDate(iso: string): string {
  return dateFmt.format(parseDate(iso));
}

/** Birthdays: include the year and parse as a local calendar date. */
export function formatBirthday(iso: string): string {
  return birthdayFmt.format(parseDate(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(parseDate(iso));
}

export function formatRange(startIso: string, endIso: string): string {
  return `${formatDate(startIso)} · ${formatTime(startIso)}–${formatTime(endIso)}`;
}

export function isPast(iso: string): boolean {
  return parseDate(iso).getTime() < Date.now();
}
