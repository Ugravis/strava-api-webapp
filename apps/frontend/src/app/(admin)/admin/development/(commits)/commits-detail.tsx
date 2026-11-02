"use client";

import type { AdminCommit } from "@kilotrace/shared/admin";
import { ExternalLinkIcon, GitPullRequestIcon, HashIcon, RocketIcon, UserIcon } from "lucide-react";
import { useMemo } from "react";
import { formatDateTime, Mark } from "@/components/admin/data-table";
import {
  DetailAction,
  DetailActions,
  DetailColumnField,
  DetailField,
  DetailFields,
  DetailHeader,
  DetailLoader,
  DetailMedia,
  DetailSection,
  DetailSkeleton,
} from "@/components/admin/detail";
import { loadCommit } from "./actions";
import { commitColumns, commitIcon, ICON_COLORS, isDeployedOf, pullRequestHref } from "./commits-columns";

/** The commit loaded by the panel, from the history GitHub serves; its skeleton meanwhile. */
export function CommitRowPanel({ sha, deployed }: { sha: string; deployed: string | null }) {
  return (
    <DetailLoader id={sha} load={loadCommit} skeleton={<DetailSkeleton media actions={2} sections={[8]} />}>
      {(commit) => <CommitDetail commit={commit} deployed={deployed} />}
    </DetailLoader>
  );
}

/** Everything GitHub tells of a commit, read only. */
function CommitDetail({ commit, deployed }: { commit: AdminCommit; deployed: string | null }) {
  const columns = useMemo(() => commitColumns(deployed), [deployed]);
  const field = (id: string, stacked?: boolean) => <DetailColumnField row={commit} columns={columns} id={id} stacked={stacked} />;
  const pullRequest = pullRequestHref(commit);
  return (
    <>
      <DetailHeader
        media={<DetailMedia icon={commitIcon(commit)} color={ICON_COLORS[commit.kind]} />}
        title={commit.title}
        subtitle={`${commit.sha.slice(0, 7)} · ${formatDateTime(commit.date)}`}
        marks={isDeployedOf(deployed)(commit) && <Mark label="Déployé" tone="green" icon={<RocketIcon />} />}
      />
      <DetailActions>
        <DetailAction label="Voir sur GitHub" icon={<ExternalLinkIcon aria-hidden />} href={commit.url} />
        <DetailAction label="Voir la pull request" icon={<GitPullRequestIcon aria-hidden />} href={pullRequest ?? undefined} disabled={!pullRequest} />
      </DetailActions>
      <DetailSection title="Commit">
        <DetailFields>
          {field("title", true)}
          {field("kind")}
          {field("pullRequest")}
          {field("author")}
          <DetailField label="Nom de l'auteur" icon={<UserIcon />}>
            {commit.author}
          </DetailField>
          {field("date")}
          <DetailField label="SHA complet" icon={<HashIcon />} copy={commit.sha}>
            <code className="font-mono text-xs break-all">{commit.sha}</code>
          </DetailField>
        </DetailFields>
      </DetailSection>
    </>
  );
}
