import { Injectable } from '@nestjs/common';
import { ApiErrorCode, ApiErrors } from '../common/api-error';

/** NIST SP 800-63B: at most 100 consecutive failures per account; far fewer here. */
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
/** Bounds the memory held under a flood of made-up identifiers. */
const MAX_TRACKED = 10_000;

interface Failures {
  count: number;
  since: number;
}

/**
 * Failed sign-ins per account, on top of the limit per IP: an attacker
 * spreading its tries over many addresses is still stopped. Unknown
 * identifiers are counted alike, so the lock never tells an account exists.
 * Kept in memory: the API runs as a single instance.
 */
@Injectable()
export class LoginAttempts {
  private readonly failures = new Map<string, Failures>();

  assertAllowed(key: string): void {
    const entry = this.current(key);
    if (entry && entry.count >= MAX_FAILURES) {
      throw ApiErrors.tooManyRequests(
        ApiErrorCode.TooManyAttempts,
        'Too many failed sign-ins, try again later',
      );
    }
  }

  recordFailure(key: string): void {
    const entry = this.current(key);
    if (entry) {
      entry.count += 1;
      return;
    }
    if (this.failures.size >= MAX_TRACKED) {
      this.prune();
    }
    this.failures.set(key, { count: 1, since: Date.now() });
  }

  reset(key: string): void {
    this.failures.delete(key);
  }

  private current(key: string): Failures | null {
    const entry = this.failures.get(key);
    if (entry && Date.now() - entry.since >= WINDOW_MS) {
      this.failures.delete(key);
      return null;
    }
    return entry ?? null;
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.failures) {
      if (now - entry.since >= WINDOW_MS) {
        this.failures.delete(key);
      }
    }
    // Still full: the oldest entries go first (a Map keeps insertion order).
    for (const key of this.failures.keys()) {
      if (this.failures.size < MAX_TRACKED) break;
      this.failures.delete(key);
    }
  }
}
