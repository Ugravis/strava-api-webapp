"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserRow, UserRowsSkeleton } from "@/components/community/user-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorCodeOf } from "@/lib/api/errors";
import type { ProfileSummary } from "@/lib/api/types";
import { FOLLOWS_PAGE_SIZE, profilesService } from "@/services/profiles.service";

/** Users asking to follow the private profile of the current user, each to accept or decline. */
export function FollowRequests({ count, onChange }: { count: number; onChange: () => void }) {
  const t = useTranslations("profile.requests");
  const tErrors = useTranslations("errors");
  const [requests, setRequests] = useState<ProfileSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [answering, setAnswering] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    profilesService.requests(0).then(
      (page) => !cancelled && setRequests(page),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [count]);

  const answer = async (user: ProfileSummary, accept: boolean) => {
    setAnswering(user.id);
    try {
      await (accept ? profilesService.acceptFollower(user.username) : profilesService.removeFollower(user.username));
      setRequests((current) => current?.filter(({ id }) => id !== user.id) ?? null);
      onChange();
    } catch (error) {
      toast.error(tErrors(errorCodeOf(error)));
    } finally {
      setAnswering(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title", { count })}</CardTitle>
      </CardHeader>
      <CardContent>
        {failed ? (
          <p className="text-sm text-muted-foreground">{t("error")}</p>
        ) : requests === null ? (
          <UserRowsSkeleton count={Math.min(count, 3)} />
        ) : (
          <ul className="divide-y">
            {requests.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                actions={
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" disabled={answering === user.id} onClick={() => void answer(user, true)}>
                      <CheckIcon aria-hidden />
                      {t("accept")}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      disabled={answering === user.id}
                      onClick={() => void answer(user, false)}
                      aria-label={t("decline")}
                      title={t("decline")}
                    >
                      <XIcon aria-hidden />
                    </Button>
                  </div>
                }
              />
            ))}
          </ul>
        )}
        {requests && count > FOLLOWS_PAGE_SIZE && (
          <p className="mt-2 text-xs text-muted-foreground">{t("more", { count: count - requests.length })}</p>
        )}
      </CardContent>
    </Card>
  );
}
