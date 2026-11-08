import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kilotrace/ui/components/ui/table";
import { cn } from "@kilotrace/ui/lib/utils";

const WIDTHS = ["w-28", "w-20", "w-24", "w-16", "w-32"];

/**
 * Stands for a `DataTable` before its page renders, e.g. in a `loading.tsx`:
 * its toolbar, the line of its header, then rows of its loading state, so
 * nothing moves when the table takes over with its own skeleton.
 */
export function DataTableSkeleton({ rows = 8, columns = 5, className }: { rows?: number; columns?: number; className?: string }) {
  const cells = Array.from({ length: columns }, (_, index) => index);
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-busy>
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 min-w-0 flex-1 rounded-lg sm:max-w-64" />
        <Skeleton className="hidden h-7 w-24 rounded-lg sm:block" />
        <Skeleton className="hidden h-7 w-24 rounded-lg sm:block" />
        <Skeleton className="ml-auto h-7 w-20 rounded-lg" />
      </div>
      <div className="border-y border-foreground/20">
        <Table>
          <TableHeader>
            <TableRow className="border-foreground/20 hover:bg-background">
              {cells.map((index) => (
                <TableHead key={index}>
                  <Skeleton className="h-3.5 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }, (_, row) => (
              <TableRow key={row} className="hover:bg-background">
                {cells.map((index) => (
                  <TableCell key={index} className="py-3">
                    {index === 0 ? (
                      <span className="flex items-center gap-2">
                        <Skeleton className="size-5 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </span>
                    ) : (
                      <Skeleton className={cn("h-4", WIDTHS[(row + index) % WIDTHS.length])} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
