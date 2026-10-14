import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiErrorCode } from "@/lib/api/errors";

/** Displays username conflicts on the field itself. Returns true when handled. */
export function applyUsernameError<T extends FieldValues & { username: string }>(
  code: ApiErrorCode,
  setError: UseFormSetError<T>,
): boolean {
  const messages: Partial<Record<ApiErrorCode, string>> = {
    USERNAME_TAKEN: "usernameTaken",
    USERNAME_RESERVED: "usernameReserved",
  };
  const message = messages[code];
  if (!message) {
    return false;
  }
  setError("username" as Path<T>, { type: "server", message }, { shouldFocus: true });
  return true;
}
