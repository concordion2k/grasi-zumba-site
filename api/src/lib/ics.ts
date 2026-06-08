/** The minimal class shape needed to build an invite (satisfied by ClassRecord and ClassSummary). */
export interface IcsEvent {
  classId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  description?: string;
}

/** Escape a value for an iCalendar text field (RFC 5545). */
function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** ISO timestamp → iCalendar UTC stamp, e.g. "2026-06-14T18:00:00.000Z" → "20260614T180000Z". */
function icsDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

/** Build a single-event .ics (iCalendar) file for a class, suitable for "add to calendar". */
export function buildClassIcs(cls: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zumba by Grasiele//Class//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:class-${cls.classId}@zumbabygrasiele.com`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(cls.startTime)}`,
    `DTEND:${icsDate(cls.endTime)}`,
    `SUMMARY:${esc(cls.title)}`,
    `LOCATION:${esc(cls.location)}`,
    ...(cls.description ? [`DESCRIPTION:${esc(cls.description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // iCalendar requires CRLF line endings.
  return lines.join('\r\n') + '\r\n';
}
