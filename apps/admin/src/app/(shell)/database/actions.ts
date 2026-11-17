"use server";

import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import { reasonOf, runAdminAction } from "@/lib/admin/actions";

/* Actions of the database page. The backend checks the role and records every call. */

export async function deleteOrphans(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAdminAction("/system/uploads/orphans", "DELETE", { reason: reasonOf(formData) ?? "" });
}
