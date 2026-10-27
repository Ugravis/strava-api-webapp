import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  labels: { navigation: string; previous: string; next: string; status: string };
}

/** Links to the previous and next pages and to the nearest ones; nothing for a single page. */
export function Pagination({ page, pages, hrefFor, labels }: PaginationProps) {
  if (pages <= 1) {
    return null;
  }
  const nearest = [...new Set([1, page - 1, page, page + 1, pages])].filter((each) => each >= 1 && each <= pages);

  return (
    <nav aria-label={labels.navigation} className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">{labels.status}</p>
      <div className="flex items-center gap-1">
        <PageLink href={page > 1 ? hrefFor(page - 1) : null} label={labels.previous}>
          <ChevronLeftIcon />
        </PageLink>
        {nearest.map((each, index) => (
          <span key={each} className="flex items-center gap-1">
            {index > 0 && each - nearest[index - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
            <Button
              size="icon-sm"
              variant={each === page ? "secondary" : "ghost"}
              nativeButton={false}
              render={<Link href={hrefFor(each)} scroll={false} aria-current={each === page ? "page" : undefined} />}
            >
              {each}
            </Button>
          </span>
        ))}
        <PageLink href={page < pages ? hrefFor(page + 1) : null} label={labels.next}>
          <ChevronRightIcon />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  if (!href) {
    return (
      <Button size="icon-sm" variant="ghost" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href={href} scroll={false} aria-label={label} />}>
      {children}
    </Button>
  );
}
