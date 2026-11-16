"use server";

import type { AdminMapStation } from "@kilotrace/shared/admin";
import { adminApi } from "@/lib/admin/api";

/** Where a station lies, with the bounds of its zone: null when it is gone. */
export async function locateStation(id: string): Promise<AdminMapStation | null> {
  if (typeof id !== "string" || !/^[1-9]\d{0,9}$/.test(id)) throw new Error("Invalid id");
  const result = await adminApi<AdminMapStation>(`/map/station/${id}`);
  if (result.ok) return result.data;
  if (result.status === 404) return null;
  throw new Error(`Admin map station ${id}: ${result.status}`);
}
