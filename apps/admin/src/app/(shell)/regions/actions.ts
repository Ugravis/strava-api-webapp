"use server";

import type { AdminRegion } from "@kilotrace/shared/admin";
import { adminApi } from "@/lib/admin/api";

/** A region for its detail, null when it is gone: its code checked before it reaches a URL. */
export async function loadRegion(code: string): Promise<AdminRegion | null> {
  if (typeof code !== "string" || !/^[A-Z]{2}$/.test(code)) throw new Error("Invalid region code");
  const result = await adminApi<AdminRegion>(`/regions/${code}`);
  if (result.ok) return result.data;
  if (result.status === 404) return null;
  throw new Error(`Admin region ${code}: ${result.status}`);
}
