import { type ReactNode, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { signupsEnabled } from "@/lib/system/status";
import { SignupsClosed } from "./signups-closed";

/**
 * The sign-up forms, or a notice while the back office keeps them closed.
 * Streamed apart, so that the rest of the page stays static.
 */
export function SignupsGate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <OpenSignups>{children}</OpenSignups>
    </Suspense>
  );
}

async function OpenSignups({ children }: { children: ReactNode }) {
  return (await signupsEnabled()) ? children : <SignupsClosed />;
}
