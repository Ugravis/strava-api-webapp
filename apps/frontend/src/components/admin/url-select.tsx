"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface UrlSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string; href: string }[];
  className?: string;
}

/** Choice among values kept in the URL, e.g. a sort order: picking one navigates. */
export function UrlSelect({ label, value, options, className }: UrlSelectProps) {
  const router = useRouter();
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => {
        const option = options.find((each) => each.value === event.target.value);
        if (option) router.push(option.href, { scroll: false });
      }}
      className={cn(
        "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
