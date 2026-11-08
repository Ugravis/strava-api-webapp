"use client";

import { useId, useState } from "react";
import { ActionDialog } from "@/components/admin/action-dialog";
import type { Action } from "@kilotrace/ui/components/admin/action-state";
import { Switch } from "@kilotrace/ui/components/ui/switch";

export interface SiteSwitchTexts {
  label: string;
  description: string;
  /** Asked before turning it off, then before turning it on. */
  off: { title: string; description: string; submit: string };
  on: { title: string; description: string; submit: string };
  cancel: string;
}

/**
 * A switch of the whole site, asked first both ways: the switch only opens
 * the confirmation, the page shows the new state once saved.
 */
export function SiteSwitch({ checked, action, canEdit, texts }: { checked: boolean; action: Action; canEdit: boolean; texts: SiteSwitchTexts }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const step = checked ? texts.off : texts.on;
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-sm font-medium">{texts.label}</span>
        <span className="block text-sm text-muted-foreground">{texts.description}</span>
      </label>
      <Switch id={id} checked={checked} disabled={!canEdit} onCheckedChange={() => setOpen(true)} className="mt-0.5 data-unchecked:bg-destructive dark:data-unchecked:bg-destructive" />
      <ActionDialog
        action={action}
        open={open}
        onOpenChange={setOpen}
        title={step.title}
        description={step.description}
        submitLabel={step.submit}
        cancelLabel={texts.cancel}
        destructive={checked}
        quiet
      />
    </div>
  );
}
