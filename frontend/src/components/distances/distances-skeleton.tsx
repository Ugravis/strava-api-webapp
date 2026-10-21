import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DistancesSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      {Array.from({ length: 2 }, (_, section) => (
        <Card key={section}>
          <CardHeader className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 3 }, (_, badge) => (
              <div key={badge} className="flex flex-col items-center gap-1.5">
                <Skeleton className="size-12 rounded-full sm:size-14" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
