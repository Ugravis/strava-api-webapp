"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { routes } from "@/config/routes";
import { authService } from "@/services/auth.service";

export function useLogout(): () => Promise<void> {
  const router = useRouter();
  return useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      router.replace(routes.home);
      router.refresh();
    }
  }, [router]);
}
