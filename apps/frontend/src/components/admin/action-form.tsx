"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import type { Action } from "./action-state";

/**
 * Form posting to a Server Action without confirmation, e.g. a toggle; the
 * outcome is told by a toast. Generic: its texts come from the caller.
 */
export function ActionForm({ action, className, children }: { action: Action; className?: string; children: ReactNode }) {
  const [result, formAction] = useActionState(action, null);

  useEffect(() => {
    if (result) {
      (result.ok ? toast.success : toast.error)(result.message);
    }
  }, [result]);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}
