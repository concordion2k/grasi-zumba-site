import { describe, it, expect } from 'vitest';
import { key, gsi1, prefix } from './keys.js';

describe('single-table keys', () => {
  it('builds user profile keys', () => {
    expect(key.userProfile('u1')).toEqual({ pk: 'USER#u1', sk: 'PROFILE' });
  });

  it('lower-cases emails in credential keys', () => {
    expect(key.emailCredential('Grasi@Example.com')).toEqual({
      pk: 'EMAIL#grasi@example.com',
      sk: 'EMAIL',
    });
  });

  it('namespaces a user booking under the user partition', () => {
    expect(key.userBooking('u1', 'c1')).toEqual({ pk: 'USER#u1', sk: 'BOOKING#c1' });
  });

  it('namespaces a roster entry under the class partition', () => {
    expect(key.classRosterEntry('c1', 'u1')).toEqual({ pk: 'CLASS#c1', sk: 'BOOKING#u1' });
  });

  it('booking and roster entries share the BOOKING# prefix for range queries', () => {
    expect(key.userBooking('u1', 'c1').sk.startsWith(prefix.booking)).toBe(true);
    expect(key.classRosterEntry('c1', 'u1').sk.startsWith(prefix.booking)).toBe(true);
  });

  it('builds GSI partitions for listings', () => {
    expect(gsi1.allUsers('2026-01-01T00:00:00.000Z').gsi1pk).toBe('USERS');
    expect(gsi1.allClasses('2026-01-01T00:00:00.000Z').gsi1pk).toBe('CLASS');
  });
});
