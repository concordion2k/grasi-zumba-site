import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('Tr0ub4dour', hash)).toBe(false);
  });

  it('produces a unique salt per hash', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
  });

  it('uses the scrypt storage format', async () => {
    const hash = await hashPassword('x');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash.split('$')).toHaveLength(6);
  });

  it('returns false for a malformed stored hash', async () => {
    expect(await verifyPassword('x', 'not-a-real-hash')).toBe(false);
  });
});
