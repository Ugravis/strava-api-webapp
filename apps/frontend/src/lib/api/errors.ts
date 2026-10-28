/** Error codes returned by the API, plus client-side fallbacks. */
export const API_ERROR_CODES = [
  "INVALID_CREDENTIALS",
  "EMAIL_TAKEN",
  "USERNAME_TAKEN",
  "USERNAME_RESERVED",
  "INVALID_TOKEN",
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
  ) {
    super(`API request failed with status ${status} (${code})`);
    this.name = "ApiError";
  }
}

function isKnownCode(code: unknown): code is ApiErrorCode {
  return typeof code === "string" && (API_ERROR_CODES as readonly string[]).includes(code);
}

export async function toApiError(response: Response): Promise<ApiError> {
  if (response.status === 429) {
    return new ApiError(response.status, "TOO_MANY_REQUESTS");
  }
  if (response.status === 413) {
    return new ApiError(response.status, "FILE_TOO_LARGE");
  }
  const body: unknown = await response.json().catch(() => null);
  const code =
    body && typeof body === "object" && "code" in body ? body.code : undefined;
  return new ApiError(response.status, isKnownCode(code) ? code : "UNEXPECTED");
}

export function errorCodeOf(error: unknown): ApiErrorCode {
  return error instanceof ApiError ? error.code : "UNEXPECTED";
}
