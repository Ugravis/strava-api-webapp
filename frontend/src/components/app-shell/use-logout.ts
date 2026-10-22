"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { routes } from "@/config/routes";
import { clearTrackStore } from "@/lib/tracks/track-store";
import { authService } from "@/services/auth.service";

export function useLogout(): () => Promise<void> {
  const router = useRouter();
  return useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      await clearTrackStore();
      router.replace(routes.home);
      router.refresh();
    }
  }, [router]);
}
