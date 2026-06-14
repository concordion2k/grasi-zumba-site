import { describe, it, expect, beforeAll } from 'vitest';
import { makeUnsubscribeToken, verifyUnsubscribeToken } from './tokens.js';

// The token helpers HMAC with SESSION_SECRET (read lazily), so set one before exercising them.
beforeAll(() => {
  process.env.SESSION_SECRET = 'unit-test-secret';
});

describe('unsubscribe tokens', () => {
  it('round-trips a userId', () => {
    const token = makeUnsubscribeToken('user-123');
    expect(verifyUnsubscribeToken(token)).toBe('user-123');
  });

  it('is deterministic for a given user but differs across users', () => {
    expect(makeUnsubscribeToken('a')).toBe(makeUnsubscribeToken('a'));
    expect(makeUnsubscribeToken('a')).not.toBe(makeUnsubscribeToken('b'));
  });

  it('rejects a tampered signature', () => {
    const token = makeUnsubscribeToken('user-123');
    expect(verifyUnsubscribeToken(`${token}x`)).toBeNull();
    expect(verifyUnsubscribeToken('user-123.not-the-real-signature')).toBeNull();
  });

  it('rejects malformed tokens (no separator)', () => {
    expect(verifyUnsubscribeToken('no-dot-here')).toBeNull();
    expect(verifyUnsubscribeToken('')).toBeNull();
  });

  it('rejects a token whose userId was swapped (signature no longer matches)', () => {
    const token = makeUnsubscribeToken('user-123');
    const sig = token.slice(token.lastIndexOf('.') + 1);
    expect(verifyUnsubscribeToken(`user-999.${sig}`)).toBeNull();
  });
});
