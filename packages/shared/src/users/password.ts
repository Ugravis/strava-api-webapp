import { normalizePassword } from "./fields";

/**
 * Bases of the most used passwords (NIST SP 800-63B blocklist), lowercased
 * and without leetspeak: matched once trailing digits and symbols are cut,
 * so `Azerty2024!` or `P@ssw0rd1` are refused too.
 */
const COMMON_BASES = new Set([
  "password", "passw0rd", "passpass", "motdepasse", "mdp", "secret", "changeme",
  "azerty", "azertyui", "azertyuiop", "qwerty", "qwertyui", "qwertyuiop", "qwertz",
  "aqwzsx", "aqwzsxedc", "qazwsx", "qazwsxedc", "zaqwsx", "asdfgh", "asdfghjk", "asdfghjkl",
  "zxcvbn", "zxcvbnm", "wxcvbn", "abcdef", "abcdefgh", "abc", "abcd", "test", "testtest",
  "demo", "admin", "adminadmin", "administrator", "administrateur", "root", "toor", "user",
  "guest", "login", "welcome", "bienvenue", "letmein", "master", "monkey", "dragon",
  "shadow", "sunshine", "princess", "princesse", "iloveyou", "jetaime", "loveyou", "love",
  "football", "baseball", "soccer", "hockey", "basketball", "superman", "batman", "pokemon",
  "starwars", "trustno", "whatever", "freedom", "computer", "internet", "michelle",
  "jennifer", "charlie", "jordan", "liverpool", "chelsea", "arsenal", "barcelona", "chocolate",
  "cookie", "flower", "summer", "winter", "soleil", "bonjour", "salut", "doudou", "loulou",
  "chouchou", "bisous", "nicolas", "julien", "camille", "thomas", "marseille", "paris",
  "france", "olympique", "allezlom", "psg", "kilotrace", "strava", "running", "runner",
  "marathon", "triathlon", "velo", "cyclisme", "cycling", "trail", "garmin", "google",
  "facebook", "samsung", "iphone", "apple", "orange", "free",
]);

/** Runs of keys or characters: any part of them is refused. */
const SEQUENCES = [
  "01234567890",
  "09876543210",
  "abcdefghijklmnopqrstuvwxyz",
  "zyxwvutsrqponmlkjihgfedcba",
  "qwertyuiop",
  "azertyuiop",
  "asdfghjkl",
  "qsdfghjklm",
  "zxcvbnm",
  "wxcvbn",
  "1qaz2wsx3edc4rfv",
  "1q2w3e4r5t6y7u8i9o0p",
];

const LEET: Record<string, string> = { "@": "a", "4": "a", "0": "o", "1": "i", "!": "i", "3": "e", "$": "s", "5": "s", "7": "t" };

/** Shorter than this, what is left beside a common base or a personal word adds nothing. */
const MIN_EXTRA_LETTERS = 4;

function lettersOf(value: string): number {
  return value.replace(/[^\p{L}]/gu, "").length;
}

/**
 * Whether a password is too easy to guess: a common one, a repeated
 * character, a keyboard run, or a personal word (`context`: username, email…)
 * with little around it. Checked by the forms and by the API.
 */
export function isCommonPassword(password: string, context: readonly string[] = []): boolean {
  const lower = normalizePassword(password).toLowerCase();
  if (/^(.)\1*$/u.test(lower) || SEQUENCES.some((sequence) => sequence.includes(lower))) {
    return true;
  }
  const trimmed = lower.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  const base = [...trimmed].map((character) => LEET[character] ?? character).join("");
  if (COMMON_BASES.has(lower) || COMMON_BASES.has(trimmed) || COMMON_BASES.has(base)) {
    return true;
  }
  return context
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length >= 3)
    .some((word) => lower.includes(word) && lettersOf(lower.split(word).join("")) < MIN_EXTRA_LETTERS);
}

/** The personal words of an account, for `isCommonPassword`. */
export function passwordContext(email: string, username: string): string[] {
  return [username, email.split("@")[0] ?? ""];
}
