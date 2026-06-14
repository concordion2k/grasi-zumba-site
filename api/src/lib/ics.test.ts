import { describe, it, expect } from 'vitest';
import { buildClassIcs } from './ics.js';

const base = {
  classId: 'abc-123',
  title: 'Morning Burn',
  startTime: '2026-06-14T18:00:00.000Z',
  endTime: '2026-06-14T19:00:00.000Z',
  location: '123 Main St, Davenport, FL 33896',
};

describe('buildClassIcs', () => {
  it('produces a valid single-event VCALENDAR', () => {
    const ics = buildClassIcs(base);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('UID:class-abc-123@zumbabygrasiele.com');
    expect(ics).toContain('SUMMARY:Morning Burn');
  });

  it('formats timestamps as iCalendar UTC stamps', () => {
    const ics = buildClassIcs(base);
    expect(ics).toContain('DTSTART:20260614T180000Z');
    expect(ics).toContain('DTEND:20260614T190000Z');
  });

  it('uses CRLF line endings (required by RFC 5545)', () => {
    expect(buildClassIcs(base).includes('\r\n')).toBe(true);
  });

  it('escapes commas and semicolons in text fields', () => {
    const ics = buildClassIcs({ ...base, title: 'Zumba, Toning; Fun' });
    expect(ics).toContain('SUMMARY:Zumba\\, Toning\\; Fun');
  });

  it('includes DESCRIPTION only when provided', () => {
    expect(buildClassIcs(base)).not.toContain('DESCRIPTION:');
    expect(buildClassIcs({ ...base, description: 'Bring water' })).toContain(
      'DESCRIPTION:Bring water',
    );
  });
});
