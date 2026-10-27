import Link from "next/link";
import { cn } from "@/lib/utils";

interface LinkPillsProps {
  label: string;
  items: { key: string; label: string; href: string; active: boolean; icon?: React.ReactNode }[];
  className?: string;
}

/** Choice among a few values, each a link: a filter or a view kept in the URL. */
export function LinkPills({ label, items, className }: LinkPillsProps) {
  return (
    <nav aria-label={label} className={cn("flex flex-wrap gap-1 rounded-lg bg-muted p-1", className)}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          scroll={false}
          aria-current={item.active ? "true" : undefined}
          aria-label={item.icon ? item.label : undefined}
          title={item.icon ? item.label : undefined}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4",
            item.active && "bg-background text-foreground shadow-sm",
          )}
        >
          {item.icon ?? item.label}
        </Link>
      ))}
    </nav>
  );
}
