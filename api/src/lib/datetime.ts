import { env } from '../env.js';

/**
 * Format a class's time window for emails. There's no browser locale server-side, so we render in a
 * configured timezone (DISPLAY_TIMEZONE) and include the zone abbreviation to keep it unambiguous.
 * Example: "Saturday, Jun 14, 6:00 – 7:00 PM EDT".
 */
export function formatClassTime(startISO: string, endISO: string): string {
  const tz = env.displayTimeZone;
  const start = new Date(startISO);
  const end = new Date(endISO);

  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  }).format(start);

  const startTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  }).format(start);

  const endTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: tz,
  }).format(end);

  return `${day}, ${startTime} – ${endTime}`;
}
