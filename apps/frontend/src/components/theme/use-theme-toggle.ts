"use client";

import { useTheme } from "next-themes";
import { useCallback } from "react";

/** Toggles between light and dark, starting from the theme currently displayed. */
export function useThemeToggle(): () => void {
  const { resolvedTheme, setTheme } = useTheme();
  return useCallback(
    () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    [resolvedTheme, setTheme],
  );
}
