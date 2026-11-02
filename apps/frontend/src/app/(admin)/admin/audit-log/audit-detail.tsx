"use client";

import { BoxIcon, EyeIcon, EyeOffIcon, KeyIcon, ListIcon, ShieldIcon } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { formatDateTime, Mark } from "@/components/admin/data-table";
import {
  DetailAction,
  DetailActions,
  DetailColumnField,
  DetailColumnFields,
  DetailField,
  DetailFields,
  DetailHeader,
  DetailItem,
  DetailItems,
  DetailLoader,
  DetailMedia,
  DetailSection,
  DetailSkeleton,
} from "@/components/admin/detail";
import { loadAuditEntry, setEntryHidden } from "./actions";
import type { OpenUser } from "../users/use-user-panel";
import { actionIcon, auditColumns, bumpAudit, useAuditVersion } from "./audit-columns";
import type { AuditRow } from "./audit-row";

const HIDE_LOCK = "Réservé aux super-admins";

/** Masks an entry from the other roles, or shows it again: by its detail or the menu of its row, a refusal told by the caller. */
export async function toggleHidden(entry: AuditRow) {
  const hidden = !entry.hiddenAt;
  const result = await setEntryHidden(entry.id, hidden);
  if (result.ok) {
    toast.success(hidden ? "Entrée masquée" : "Entrée de nouveau visible");
    bumpAudit();
  }
  return result;
}

/** The entry loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function AuditRowPanel({ id, superAdmin, openUser }: { id: string; superAdmin: boolean; openUser: OpenUser }) {
  const version = useAuditVersion();
  return (
    <DetailLoader id={id} load={loadAuditEntry} refreshKey={version} skeleton={<DetailSkeleton media actions={1} sections={[7, 2]} />}>
      {(entry) => <AuditDetail entry={entry} superAdmin={superAdmin} openUser={openUser} />}
    </DetailLoader>
  );
}

/** Everything about an entry of the logs, append-only: the super-admins only mask it from the other roles. */
function AuditDetail({ entry, superAdmin, openUser }: { entry: AuditRow; superAdmin: boolean; openUser: OpenUser }) {
  const columns = useMemo(() => auditColumns(openUser), [openUser]);
  const field = (id: string) => <DetailColumnField row={entry} columns={columns} id={id} />;
  const target = entry.targetId && !entry.targetUser ? `${entry.targetType ?? "objet"} ${entry.targetId}` : null;
  return (
    <>
      <DetailHeader
        media={<DetailMedia icon={actionIcon(entry)} />}
        title={entry.label}
        subtitle={formatDateTime(entry.createdAt)}
        marks={entry.hiddenAt && <Mark label="Masquée" tone="gray" icon={<EyeOffIcon />} />}
      />
      <DetailActions>
        <DetailAction
          label={entry.hiddenAt ? "Ne plus masquer" : "Masquer aux autres rôles"}
          icon={entry.hiddenAt ? <EyeIcon aria-hidden /> : <EyeOffIcon aria-hidden />}
          locked={superAdmin ? null : HIDE_LOCK}
          onClick={() => toggleHidden(entry)}
        />
      </DetailActions>
      <DetailSection title="Entrée">
        <DetailFields>
          {field("createdAt")}
          {field("actor")}
          {target ? (
            <DetailField label="Cible" icon={<BoxIcon />}>
              {target}
            </DetailField>
          ) : (
            field("target")
          )}
          {field("action")}
          <DetailField label="Clé de l'action" icon={<KeyIcon />}>
            <code className="font-mono text-xs">{entry.action}</code>
          </DetailField>
          {field("outcome")}
          {field("status")}
          {field("id")}
          {entry.hiddenAt !== undefined && (
            <DetailField label="Visibilité" icon={<ShieldIcon />}>
              {entry.hiddenAt ? `Masquée le ${formatDateTime(entry.hiddenAt)}` : "Visible de tous les rôles admin"}
            </DetailField>
          )}
        </DetailFields>
      </DetailSection>
      <DetailSection title="Contenu">
        <DetailFields>
          <DetailColumnField row={entry} columns={columns} id="reason" stacked />
          <DetailField label="Détails" icon={<ListIcon />} stacked copy={entry.lines.join("\n") || null}>
            {entry.lines.length > 0 && (
              <DetailItems>
                {entry.lines.map((line) => (
                  <DetailItem key={line}>{line}</DetailItem>
                ))}
              </DetailItems>
            )}
          </DetailField>
        </DetailFields>
      </DetailSection>
    </>
  );
}
