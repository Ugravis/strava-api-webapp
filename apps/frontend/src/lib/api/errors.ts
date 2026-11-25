import type { VerificationChallenge } from "@kilotrace/shared";

/** Error codes returned by the API, plus client-side fallbacks. */
export const API_ERROR_CODES = [
  "INVALID_CREDENTIALS",
  "EMAIL_TAKEN",
  "USERNAME_TAKEN",
  "USERNAME_RESERVED",
  "INVALID_TOKEN",
  "INVALID_CODE",
  "EMAIL_NOT_VERIFIED",
  "PASSWORD_TOO_COMMON",
  "TOO_MANY_ATTEMPTS",
  "INVALID_PASSWORD",
  "CONFIRMATION_MISMATCH",
  "INVALID_IMAGE",
  "OAUTH_SIGNUP_EXPIRED",
  "EMAIL_SIGN_IN_DISABLED",
  "ACCOUNT_SUSPENDED",
  "SIGNUPS_DISABLED",
  "PROVIDER_NOT_CONNECTED",
  "CANNOT_FOLLOW_SELF",
  "ALREADY_FOLLOWING",
  "NOT_FOLLOWING",
  "PRIVATE_PROFILE",
  "NO_FOLLOW_REQUEST",
  "PROFILE_BADGES_FULL",
  "CANNOT_LIKE_SELF",
  "CANNOT_REPORT_SELF",
  "ALREADY_REPORTED",
  "REPORT_DETAILS_REQUIRED",
  "NOT_FOUND",
  "TOO_MANY_REQUESTS",
  "FILE_TOO_LARGE",
  "UNEXPECTED",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    /** Sent with `EMAIL_NOT_VERIFIED`: the code of the sign-up to enter. */
    readonly challenge: VerificationChallenge | null = null,
  ) {
    super(`API request failed with status ${status} (${code})`);
    this.name = "ApiError";
  }
}

function isKnownCode(code: unknown): code is ApiErrorCode {
  return typeof code === "string" && (API_ERROR_CODES as readonly string[]).includes(code);
}

function isChallenge(value: unknown): value is VerificationChallenge {
  return (
    !!value &&
    typeof value === "object" &&
    "challengeId" in value &&
    typeof value.challengeId === "string" &&
    "resendAvailableAt" in value &&
    typeof value.resendAvailableAt === "string"
  );
}

export async function toApiError(response: Response): Promise<ApiError> {
  if (response.status === 413) {
    return new ApiError(response.status, "FILE_TOO_LARGE");
  }
  const body: unknown = await response.json().catch(() => null);
  const code =
    body && typeof body === "object" && "code" in body ? body.code : undefined;
  if (response.status === 429 && code !== "TOO_MANY_ATTEMPTS") {
    return new ApiError(response.status, "TOO_MANY_REQUESTS");
  }
  const challenge =
    body && typeof body === "object" && "challenge" in body && isChallenge(body.challenge)
      ? body.challenge
      : null;
  return new ApiError(response.status, isKnownCode(code) ? code : "UNEXPECTED", challenge);
}

export function errorCodeOf(error: unknown): ApiErrorCode {
  return error instanceof ApiError ? error.code : "UNEXPECTED";
}
