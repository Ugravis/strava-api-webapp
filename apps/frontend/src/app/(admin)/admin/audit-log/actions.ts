"use server";

import type { ActionResult } from "@/components/admin/action-state";
import { checkedId, runAdminAction } from "@/lib/admin/actions";

/** Masks an entry from everyone but the super-admins, or shows it again; recorded too. */
export async function setEntryHidden(id: string, hidden: boolean): Promise<ActionResult> {
  return runAdminAction(`/audit-log/${checkedId(id)}/hidden`, hidden ? "PUT" : "DELETE");
}
