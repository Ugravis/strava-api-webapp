"use server";

import type { AdminMapRegion, AdminMapStation, AdminMapVersion } from "@kilotrace/shared/admin";
import { adminApi } from "@/lib/admin/api";

/** Where a station lies, with the bounds of its zone: null when it is gone. */
export async function locateStation(id: string): Promise<AdminMapStation | null> {
  if (typeof id !== "string" || !/^[1-9]\d{0,9}$/.test(id)) throw new Error("Invalid id");
  const result = await adminApi<AdminMapStation>(`/map/station/${id}`);
  if (result.ok) return result.data;
  if (result.status === 404) return null;
  throw new Error(`Admin map station ${id}: ${result.status}`);
}

/** How the map frames a region, on its main landmass: null when it is gone. */
export async function locateRegion(code: string): Promise<AdminMapRegion | null> {
  if (typeof code !== "string" || !/^[A-Z]{2}$/.test(code)) throw new Error("Invalid region code");
  const result = await adminApi<AdminMapRegion>(`/map/region/${code}`);
  if (result.ok) return result.data;
  if (result.status === 404) return null;
  throw new Error(`Admin map region ${code}: ${result.status}`);
}

/** The versions of the tiles of the map: a new one after each import. */
export async function loadMapVersion(): Promise<AdminMapVersion> {
  const result = await adminApi<AdminMapVersion>("/map/version");
  if (!result.ok) throw new Error(`Admin map version: ${result.status}`);
  return result.data;
}
