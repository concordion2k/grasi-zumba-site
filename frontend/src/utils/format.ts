/** Human-friendly date/time formatting helpers. */

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatRange(startIso: string, endIso: string): string {
  return `${formatDate(startIso)} · ${formatTime(startIso)}–${formatTime(endIso)}`;
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}
