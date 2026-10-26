"use client";

import { RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@kilotrace/ui/components/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@kilotrace/ui/components/skeleton";
import { apiRequest } from "@/lib/api/client";
import { DevTable } from "./dev-table";

type Row = Record<string, unknown>;

interface QuotaWindow {
  usage: number;
  limit: number;
}

interface Quota {
  fifteenMinutes: QuotaWindow;
  daily: QuotaWindow;
}

interface DevOverview {
  generatedAt: string;
  counts: Row;
  strava: {
    subscription: { id: number; callbackUrl: string | null } | null;
    rateLimit: { observedAt: string | null; overall: Quota | null; read: Quota | null };
  };
  users: Row[];
  connections: Row[];
  syncJobs: Row[];
  webhookEvents: Row[];
  activities: Row[];
}

const REFRESH_INTERVAL_MS = 3_000;

function Section({ title, count, defaultOpen, children }: { title: string; count?: number; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} className="group flex flex-col gap-2">
      <summary className="cursor-pointer text-sm font-medium select-none">
        {title}
        {count !== undefined && <span className="ml-1 text-muted-foreground">({count})</span>}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function formatQuota(quota: Quota | null): string {
  if (!quota) return "inconnu";
  const { fifteenMinutes: short, daily } = quota;
  return `${short.usage}/${short.limit} (15 min) · ${daily.usage}/${daily.limit} (jour)`;
}

/**
 * Read-only view of the database, refreshed automatically while it is shown,
 * to follow imports and webhooks. Rows changed in the last minute are highlighted.
 */
export function DevOverviewContent() {
  const [overview, setOverview] = useState<DevOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(
    () =>
      apiRequest<DevOverview>("/dev/overview").then(
        (next) => {
          setOverview(next);
          setError(null);
        },
        (failure: unknown) => setError(String(failure)),
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    apiRequest<DevOverview>("/dev/overview").then(
      (next) => {
        if (!cancelled) setOverview(next);
      },
      (failure: unknown) => {
        if (!cancelled) setError(String(failure));
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  const now = overview ? new Date(overview.generatedAt).getTime() : 0;
  const { subscription, rateLimit } = overview?.strava ?? {};

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Checkbox id="dev-auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          <Label htmlFor="dev-auto-refresh">Rafraîchir toutes les 3 secondes</Label>
        </div>
        <Button size="icon" variant="ghost" onClick={() => void load()} aria-label="Rafraîchir">
          <RefreshCwIcon />
        </Button>
      </div>
      {overview && (
        <p className="text-xs text-muted-foreground">
          Mis à jour à {new Date(overview.generatedAt).toLocaleTimeString("fr-FR")}.
        </p>
      )}
      {error && <p className="font-mono text-xs text-destructive">{error}</p>}
      {!overview ? (
        <div className="flex flex-col gap-2" aria-busy>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs sm:grid-cols-3">
            {Object.entries(overview.counts).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-1 font-mono text-xs break-all">
            <p>
              <span className="text-muted-foreground">webhook : </span>
              {subscription ? `#${subscription.id} → ${subscription.callbackUrl ?? "?"}` : "aucune souscription active"}
            </p>
            <p>
              <span className="text-muted-foreground">quota lecture : </span>
              {formatQuota(rateLimit?.read ?? null)}
            </p>
            <p>
              <span className="text-muted-foreground">quota global : </span>
              {formatQuota(rateLimit?.overall ?? null)}
            </p>
          </div>
          <Section title="Événements webhook" count={overview.webhookEvents.length} defaultOpen>
            <DevTable rows={overview.webhookEvents} now={now} />
          </Section>
          <Section title="Activités (dernières modifiées)" count={overview.activities.length} defaultOpen>
            <DevTable rows={overview.activities} now={now} />
          </Section>
          <Section title="Jobs de synchronisation" count={overview.syncJobs.length}>
            <DevTable rows={overview.syncJobs} now={now} />
          </Section>
          <Section title="Connexions" count={overview.connections.length}>
            <DevTable rows={overview.connections} now={now} />
          </Section>
          <Section title="Utilisateurs" count={overview.users.length}>
            <DevTable rows={overview.users} now={now} />
          </Section>
        </>
      )}
    </div>
  );
}
