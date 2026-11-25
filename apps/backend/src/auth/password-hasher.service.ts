import { Injectable } from '@nestjs/common';
import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';
import { normalizePassword } from '@kilotrace/shared';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
/** OWASP minimum for scrypt: 128 MiB of memory per hash (128 * N * r bytes). */
const PARAMS = { N: 2 ** 17, r: 8, p: 1 } as const;
const MAX_MEMORY = 256 * 1024 * 1024;

function deriveKey(
  password: string,
  salt: Buffer,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/**
 * Hashes passwords with scrypt (memory-hard, built into Node.js).
 * Format: `scrypt$N$r$p$salt$hash`, so parameters can evolve without breaking stored hashes.
 * Passwords are normalized (NFKC) first, as NIST SP 800-63B recommends.
 */
@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await deriveKey(normalizePassword(password), salt, {
      ...PARAMS,
      maxmem: MAX_MEMORY,
    });
    return [
      'scrypt',
      PARAMS.N,
      PARAMS.r,
      PARAMS.p,
      salt.toString('base64'),
      key.toString('base64'),
    ].join('$');
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const normalized = normalizePassword(password);
    if (await this.matches(normalized, storedHash)) {
      return true;
    }
    // Hashes made before the normalization took the password as typed.
    return normalized !== password && this.matches(password, storedHash);
  }

  /** Whether a hash was made with older parameters (or as typed): to redo at the next sign-in. */
  needsRehash(storedHash: string): boolean {
    const [, n, r, p] = storedHash.split('$');
    return (
      Number(n) !== PARAMS.N || Number(r) !== PARAMS.r || Number(p) !== PARAMS.p
    );
  }

  private async matches(
    password: string,
    storedHash: string,
  ): Promise<boolean> {
    const [algorithm, n, r, p, salt, hash] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !hash) {
      return false;
    }
    const expected = Buffer.from(hash, 'base64');
    const actual = await deriveKey(password, Buffer.from(salt, 'base64'), {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAX_MEMORY,
    });
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
