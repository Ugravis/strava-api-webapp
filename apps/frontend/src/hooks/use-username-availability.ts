"use client";

import { useEffect, useState } from "react";
import { usernameSchema } from "@/lib/validation/schemas";
import { authService } from "@/services/auth.service";
import { useDebouncedValue } from "./use-debounced-value";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "reserved";

interface CheckResult {
  username: string;
  status: Exclude<UsernameStatus, "idle" | "checking">;
}

/**
 * Checks, while the user types, whether a username is free. `currentUsername`
 * is considered available so that editing a profile does not report a conflict.
 */
export function useUsernameAvailability(
  value: string,
  currentUsername?: string,
): UsernameStatus {
  const parsed = usernameSchema.safeParse(value);
  const candidate = parsed.success ? parsed.data : null;
  const shouldCheck = candidate !== null && candidate !== currentUsername;
  const debounced = useDebouncedValue(shouldCheck ? candidate : null, 400);
  const [result, setResult] = useState<CheckResult | null>(null);

  useEffect(() => {
    if (!debounced) {
      return;
    }
    let cancelled = false;
    authService
      .checkUsername(debounced)
      .then((availability) => {
        if (cancelled) return;
        setResult({
          username: debounced,
          status: availability.available
            ? "available"
            : availability.reason === "reserved"
              ? "reserved"
              : "taken",
        });
      })
      // The check is only a hint: the API validates again on submit.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  if (!shouldCheck) {
    return "idle";
  }
  return result?.username === candidate ? result.status : "checking";
}
