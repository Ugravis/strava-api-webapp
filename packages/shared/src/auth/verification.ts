/** One-time code sent by email to prove the address: at sign-up and to reset a password. */
export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_CODE_PATTERN = /^\d{6}$/;

/** A code sent and the challenge it answers, as the API returns it. */
export interface VerificationChallenge {
  challengeId: string;
  /** ISO instant from which another code may be sent. */
  resendAvailableAt: string;
}

/** Body of the error refusing a sign-in to an account whose email is not verified yet. */
export interface EmailNotVerifiedError {
  code: "EMAIL_NOT_VERIFIED";
  challenge: VerificationChallenge;
}

/** Lifetime of each code sent. */
export const VERIFICATION_CODE_TTL_MINUTES = 10;
