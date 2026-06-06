import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/** Promisified scrypt that keeps the options argument (Node's util.promisify drops the overload). */
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * Password hashing using scrypt (memory-hard, built into Node — no native deps to compile for the
 * Lambda runtime). Stored format: `scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>`.
 *
 * Upgrade path: this module is the single seam to swap in `@node-rs/argon2` (argon2id) later —
 * `hashPassword`/`verifyPassword` are the only surface the rest of the app depends on.
 */

const N = 2 ** 15; // CPU/memory cost
const R = 8; // block size
const P = 1; // parallelisation
const KEY_LEN = 64;
const SALT_BYTES = 16;
// scrypt needs maxmem large enough for the chosen N; default is too small at N=2^15.
const MAX_MEM = 128 * N * R * 2;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scrypt(password, salt, KEY_LEN, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEM,
  })) as Buffer;
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  const salt = Buffer.from(saltHex!, 'hex');
  const expected = Buffer.from(hashHex!, 'hex');
  const derived = (await scrypt(password, salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: 128 * n * r * 2,
  })) as Buffer;
  // Constant-time comparison; lengths already match by construction.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
