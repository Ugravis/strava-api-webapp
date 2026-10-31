"use client";

import { ADMIN_ROLES, type AdminRole, type AdminTeamMember } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { AtSignIcon, CalendarCheckIcon, ClockIcon, CopyIcon, KeyRoundIcon, ListClockIcon, MailIcon, PanelRightOpenIcon, UserMinusIcon, UserRoundCogIcon, UserRoundIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionDialog } from "@/components/admin/action-dialog";
import { type FormField, FormDialog } from "@/components/admin/form-dialog";
import { type DataTableConfig, DataTable, dateColumn, Mark, numberColumn, pillsColumn, RowActions, textColumn, type Tone, userColumn } from "@/components/admin/data-table";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { publicNameOf } from "@/lib/user";
import { addMember, changeRole, fetchTeamTable, removeMember, searchCandidates } from "./actions";

const ROLES: Record<AdminRole, { label: string; tone: Tone }> = {
  support: { label: "Support", tone: "gray" },
  admin: { label: "Admin", tone: "blue" },
  "super-admin": { label: "Super-admin", tone: "violet" },
};

/** Keys of the grouping by role, as the backend sends them: the rank from the top. */
const roleOfGroup = (key: string): AdminRole | undefined => [...ADMIN_ROLES].reverse()[Number(key) - 1];

const roleField = (defaultValue: AdminRole): FormField => ({
  kind: "select",
  name: "role",
  label: "Rôle",
  hint: "Les permissions de chaque rôle se règlent dans le tableau sous l'équipe. Super-admin : tout, y compris l'équipe.",
  defaultValue,
  options: ADMIN_ROLES.map((role) => ({ value: role, label: ROLES[role].label })),
});

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/**
 * The team, highest role first. Every member reads, `canEdit` adds members,
 * changes their role or removes them, never on one's own row.
 */
export function TeamTable({ meId, canEdit, usersPath, auditLogPath }: { meId: string | null; canEdit: boolean; usersPath: string; auditLogPath: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  // Kept once closed, so that the texts stay while the dialogs fade out.
  const [changing, setChanging] = useState<{ open: boolean; member: AdminTeamMember | null }>({ open: false, member: null });
  const [removing, setRemoving] = useState<{ open: boolean; member: AdminTeamMember | null }>({ open: false, member: null });
  // Each change gives a new source, fetched again; the counts of the roles follow.
  const [version, setVersion] = useState(0);
  const changed = () => {
    setVersion((each) => each + 1);
    router.refresh();
  };

  const config = useMemo<DataTableConfig<AdminTeamMember>>(() => {
    // The panel opens above, the table keeping its picks in the URL.
    const open = (member: AdminTeamMember) => router.push(`${usersPath}/${member.id}${window.location.search}`, { scroll: false });
    return {
      id: "team",
      fetch: (query: TableQuery) => fetchTeamTable(query),
      rowId: (member) => member.id,
      onOpen: open,
      search: "Nom, @username ou e-mail",
      noun: (count) => (count > 1 ? "membres" : "membre"),
      empty: { title: "Aucun membre", description: "Personne dans l'équipe pour l'instant." },
      defaultSort: { id: "role", desc: true },
      views: [
        { id: "cards", label: "Cartes", layout: "cards", columns: ["member", "role", "email", "logsCount"] },
        { id: "table", label: "Table" },
      ],
      columns: [
        userColumn({
          id: "member",
          header: "Membre",
          icon: <AtSignIcon />,
          sortable: true,
          value: (member) => member,
          marks: (member) => member.id === meId && <Mark label="Vous" tone="sky" icon={<UserRoundIcon />} />,
        }),
        pillsColumn({ id: "role", header: "Rôle", icon: <KeyRoundIcon />, sortable: true, value: (member) => [ROLES[member.role]] }),
        dateColumn({ id: "roleSince", header: "Rôle depuis", icon: <CalendarCheckIcon />, sortable: true, value: (member) => member.roleSince }),
        textColumn({ id: "email", header: "E-mail", icon: <MailIcon />, sortable: true, value: (member) => member.email, muted: true, width: "max-w-52" }),
        numberColumn({ id: "logsCount", header: "Logs", icon: <ListClockIcon />, sortable: true, zero: true, value: (member) => member.logsCount }),
        dateColumn({ id: "lastSeenAt", header: "Dernière visite", icon: <ClockIcon />, sortable: true, value: (member) => member.lastSeenAt, relative: true }),
      ],
      facets: [{ id: "role", label: "Rôle", options: [...ADMIN_ROLES].reverse().map((role) => ({ value: role, label: ROLES[role].label })) }],
      groupings: [{ id: "role", label: "Rôle", title: (key) => ROLES[roleOfGroup(key) ?? "support"].label }],
      ...(canEdit && { create: { label: "Ajouter", onClick: () => setAdding(true) } }),
      actions: (member) => (
        <RowActions label={`Actions de @${member.username}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => open(member)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`${auditLogPath}?actor=${member.id}`)}>
              <ListClockIcon />
              Voir ses logs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(member.email, "E-mail copié")}>
              <CopyIcon />
              Copier l&apos;e-mail
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {canEdit && member.id !== meId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setChanging({ open: true, member })}>
                <UserRoundCogIcon />
                Changer le rôle
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setRemoving({ open: true, member })}>
                <UserMinusIcon />
                Retirer de l&apos;équipe
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    };
    // `version` gives a new source, fetched again, after each change.
  }, [auditLogPath, canEdit, meId, router, usersPath, version]);

  const changingName = changing.member ? publicNameOf(changing.member) : "";
  const removingName = removing.member ? publicNameOf(removing.member) : "";
  return (
    <>
      <DataTable config={config} />
      {canEdit && (
        <>
          <FormDialog
            open={adding}
            onOpenChange={setAdding}
            onSuccess={changed}
            action={addMember}
            title="Ajouter un membre"
            description="Le compte reçoit le rôle choisi et le tag Équipe sur son profil, et en est notifié."
            submitLabel="Ajouter"
            cancelLabel="Annuler"
            fields={[
              { kind: "user", name: "user", label: "Compte", placeholder: "Pseudo, nom ou email", emptyLabel: "Aucun compte hors de l'équipe ne correspond.", search: searchCandidates },
              roleField("support"),
            ]}
          />
          <FormDialog
            open={changing.open}
            onOpenChange={(value) => setChanging({ ...changing, open: value })}
            onSuccess={changed}
            action={changeRole.bind(null, changing.member?.id ?? "")}
            title={`Changer le rôle de ${changingName}`}
            description="Le membre est notifié de son nouveau rôle."
            submitLabel="Enregistrer"
            cancelLabel="Annuler"
            fields={[roleField(changing.member?.role ?? "support")]}
          />
          <ActionDialog
            open={removing.open}
            onOpenChange={(value) => setRemoving({ ...removing, open: value })}
            onSuccess={changed}
            action={removeMember.bind(null, removing.member?.id ?? "")}
            title={`Retirer ${removingName} de l'équipe ?`}
            description="Le compte perd l'accès au back-office et le tag Équipe. Il en est notifié."
            submitLabel="Retirer"
            cancelLabel="Annuler"
            destructive
          />
        </>
      )}
    </>
  );
}
