"use client";

import type { ComponentProps } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * The checkbox of the kit, blue once checked: the selection of the rows, and
 * any cell to tick. Inline, so that a column `text-center` centres it.
 */
export function TableCheckbox({ className, ...props }: ComponentProps<typeof Checkbox>) {
  return (
    <Checkbox
      className={cn(
        "inline-flex align-middle data-checked:border-blue-600 data-checked:bg-blue-600 data-checked:text-white data-indeterminate:border-blue-600 data-indeterminate:bg-blue-600 data-indeterminate:text-white dark:data-checked:bg-blue-600",
        className,
      )}
      {...props}
    />
  );
}
