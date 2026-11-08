import { Injectable } from '@nestjs/common';
import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const MAX_MEMORY = 64 * 1024 * 1024;

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
 */
@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await deriveKey(password, salt, {
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
