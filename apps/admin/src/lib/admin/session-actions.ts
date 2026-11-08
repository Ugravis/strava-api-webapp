"use server";

import { redirect } from "next/navigation";
import { adminApi } from "./api";
import { closeSession } from "./session";

/** Signs out of the back office only; the session of the site, if any, stays. */
export async function signOut(): Promise<void> {
  await adminApi("/session", "DELETE").catch(() => null);
  await closeSession();
  redirect("/login");
}
