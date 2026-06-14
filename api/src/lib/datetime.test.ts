import { describe, it, expect } from 'vitest';
import { formatClassTime } from './datetime.js';

// Node's Intl uses a narrow no-break space (U+202F) before AM/PM; normalize it for assertions.
const norm = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

// No DISPLAY_TIMEZONE is set in the test env, so these assert against the default America/New_York.
describe('formatClassTime', () => {
  it('renders the date + time window with a timezone abbreviation (summer = EDT)', () => {
    const out = norm(formatClassTime('2026-06-14T18:00:00.000Z', '2026-06-14T19:00:00.000Z'));
    // 18:00Z / 19:00Z in America/New_York (UTC-4 in June) → 2:00–3:00 PM EDT.
    expect(out).toContain('Jun 14');
    expect(out).toContain('2:00 PM');
    expect(out).toContain('3:00 PM EDT');
    expect(out).toContain('–'); // en-dash between start and end
  });

  it('reflects daylight-saving changes (winter = EST)', () => {
    const out = norm(formatClassTime('2026-01-10T18:00:00.000Z', '2026-01-10T19:00:00.000Z'));
    // UTC-5 in January → 1:00–2:00 PM EST.
    expect(out).toContain('1:00 PM');
    expect(out).toContain('2:00 PM EST');
  });
});
