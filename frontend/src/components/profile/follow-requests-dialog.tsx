"use client";

import { InboxIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { useFollowsSummary } from "@/components/community/follows-summary-provider";
import { RequestAnswerButtons } from "@/components/community/request-answer-buttons";
import { UserRow, UserRowsSkeleton } from "@/components/community/user-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type FollowsListState, usePagedUsers } from "@/hooks/use-follows-list";
import { cn } from "@/lib/utils";
import { profilesService } from "@/services/profiles.service";

type RequestsTab = "received" | "sent";

const TABS: RequestsTab[] = ["received", "sent"];

/** Count shown on the button, capped. */
function countLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

/**
 * A button opening the follow requests of the current user: those to answer,
 * counted on the button (in red while one was never seen in the
 * notifications), and those they sent, in a second tab.
 */
export function FollowRequestsDialog({ onAnswered }: { onAnswered?: (username: string) => void }) {
  const t = useTranslations("profile.requests");
  const { summary } = useFollowsSummary();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<RequestsTab>("received");
  const count = summary?.requestsCount ?? 0;
  const label = count > 0 ? t("openCount", { count }) : t("open");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} title={label} className="relative" />}
      >
        <InboxIcon />
        {count > 0 && (
          <span
            aria-hidden
            className={cn(
              "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums",
              summary?.unseenRequests ? "bg-rose-500" : "bg-muted-foreground",
            )}
          >
            {countLabel(count)}
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(40rem,calc(100dvh-2rem))] flex-col gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("open")}</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(next) => setTab(next as RequestsTab)}>
          <TabsList className="w-full">
            {TABS.map((each) => (
              <TabsTrigger key={each} value={each}>
                {t(each)}
                {each === "received" && count > 0 && (
                  <span className="text-muted-foreground tabular-nums">{count}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div
          className="-mx-4 min-h-40 flex-1 overflow-y-auto px-4"
          aria-live="polite"
          // Following a link to a profile closes the dialog.
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {tab === "received" ? <ReceivedRequests onAnswered={onAnswered} /> : <SentRequests />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReceivedRequests({ onAnswered }: { onAnswered?: (username: string) => void }) {
  const list = usePagedUsers(profilesService.requests);
  /** Answered here, no longer listed. */
  const [answered, setAnswered] = useState<ReadonlySet<string>>(new Set());

  return (
    <RequestsList
      list={list}
      hidden={answered}
      empty="emptyReceived"
      actions={(username) => (
        <RequestAnswerButtons
          username={username}
          onAnswered={() => {
            setAnswered((current) => new Set(current).add(username));
            onAnswered?.(username);
          }}
        />
      )}
    />
  );
}

/** Requests sent by the current user, each with a button to cancel it. */
function SentRequests() {
  const list = usePagedUsers(profilesService.sentRequests);
  return <RequestsList list={list} empty="emptySent" />;
}

interface RequestsListProps {
  list: FollowsListState;
  hidden?: ReadonlySet<string>;
  empty: "emptyReceived" | "emptySent";
  actions?: (username: string) => ReactNode;
}

function RequestsList({ list, hidden, empty, actions }: RequestsListProps) {
  const t = useTranslations("profile.requests");
  const { users, hasMore, loadingMore, error, loadMore } = list;
  const shown = users?.filter(({ username }) => !hidden?.has(username));

  if (error) return <p className="py-6 text-center text-sm text-destructive">{t("error")}</p>;
  if (!shown) return <UserRowsSkeleton count={3} />;
  if (shown.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{t(empty)}</p>;
  return (
    <div className="flex flex-col gap-2 pb-1">
      <ul className="divide-y">
        {shown.map((user) => (
          <UserRow key={user.id} user={user} actions={actions?.(user.username)} />
        ))}
      </ul>
      {hasMore && (
        <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore} className="self-center">
          {t("loadMore")}
        </Button>
      )}
    </div>
  );
}
