"use client";

import { type AdminBadge, type AdminBadgeFamily, type AdminBadgeMetric, type AdminBadgeTheme, BADGE_RULES, type CreateBadgeRequest } from "@kilotrace/shared/admin";
import { ArrowDownUpIcon, CopyPlusIcon, FingerprintIcon, FlagIcon, ListOrderedIcon, StickyNoteIcon, Trash2Icon, TypeIcon } from "lucide-react";
import { useMemo } from "react";
import {
  DetailAction,
  DetailActions,
  DetailColumnFields,
  DetailField,
  DetailFields,
  DetailForm,
  DetailHeader,
  DetailLoader,
  DetailSection,
  DetailSectionForm,
  DetailSkeleton,
  fromRule,
  type RowPanelControls,
} from "@kilotrace/ui/components/admin/detail";
import { BADGE_ICON_KEYS } from "@kilotrace/ui/components/distances/badge-icon";
import { createBadge, loadBadge } from "./actions";
import { type BadgeRights, bumpCatalog, deleteBadgeOf, FAMILY_OPTIONS, LOCKS, METRIC_OPTIONS, METRICS, saveBadgeWith, themeOptions, useCatalogVersion } from "./badge-bits";
import { AdminBadgeBanner, badgeColumns } from "./badge-columns";
import { shownAmount, storedAmount } from "./units";

/** What a badge asks, as typed: amounts in the unit shown, tiers as typed. */
interface Objective {
  metric: AdminBadgeMetric | null;
  family: AdminBadgeFamily | null;
  target: number | null;
  tiers: string[];
}

/** A badge being typed: every field may still be empty. */
export interface BadgeDraft extends Objective {
  id: string | null;
  name: string | null;
  description: string | null;
  themeId: string | null;
  icon: string | null;
  backgroundColor: string | null;
}

const BLANK: BadgeDraft = {
  id: null,
  name: null,
  description: null,
  metric: "distance",
  family: "all",
  target: null,
  tiers: [],
  themeId: null,
  icon: BADGE_ICON_KEYS[0],
  backgroundColor: null,
};

const amountOf = (typed: string) => Number(typed.replace(",", ".").trim());
const amount = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

/** Why the tiers typed are refused, or null: positive amounts, ascending. */
function tiersError(tiers: string[]): string | null {
  const values = tiers.map(amountOf);
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return "Chaque palier est un nombre positif, par exemple 42,195.";
  if (values.some((value, index) => index > 0 && value <= values[index - 1])) return "Les paliers vont en croissant.";
  return null;
}

/** The objective of a badge as typed, stored: a tiered badge targets its last tier. */
function storedObjective({ metric, family, target, tiers }: Objective) {
  const scale = (shown: number) => storedAmount(metric!, shown);
  const stored = tiers.map((tier) => scale(amountOf(tier)));
  return { metric: metric!, family: family!, tiers: stored.length > 0 ? stored : null, target: stored.at(-1) ?? scale(target ?? 0) };
}

/** The objective of a badge in the unit shown. */
const objectiveOf = (badge: AdminBadge): Objective => ({
  metric: badge.metric,
  family: badge.family,
  target: badge.tiers ? null : shownAmount(badge.metric, badge.target),
  tiers: badge.tiers?.map((tier) => amount.format(shownAmount(badge.metric, tier))) ?? [],
});

/** The fields of a badge copied into the draft of a new one, by « Dupliquer ». */
export function copyOfBadge(badge: AdminBadge): Partial<BadgeDraft> {
  const { name, description, themeId, icon, backgroundColor } = badge;
  return { name, description, themeId, icon, backgroundColor, ...objectiveOf(badge) };
}

/** The badge loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function BadgeRowPanel({ id, themes, rights, panel }: { id: string; themes: AdminBadgeTheme[]; rights: BadgeRights; panel: RowPanelControls }) {
  const version = useCatalogVersion();
  return (
    <DetailLoader id={id} load={loadBadge} refreshKey={version} skeleton={<DetailSkeleton cover actions={2} sections={[7, 4, 3, 2]} />}>
      {(badge) => <BadgeDetail badge={badge} themes={themes} rights={rights} panel={panel} />}
    </DetailLoader>
  );
}

/**
 * Everything about a badge, its fields edited in place, its objective as a
 * whole (the metric, the sports, the amount and the tiers hang on each
 * other).
 */
function BadgeDetail({ badge, themes, rights, panel }: { badge: AdminBadge; themes: AdminBadgeTheme[]; rights: BadgeRights; panel: RowPanelControls }) {
  const columns = useMemo(() => badgeColumns(themes, rights.edit), [themes, rights.edit]);
  const locked = rights.edit ? null : LOCKS.edit;
  const removal = deleteBadgeOf(badge, () => panel.removed(badge.id));

  return (
    <>
      <AdminBadgeBanner badge={badge} className="h-40 shrink-0" />
      <DetailHeader title={badge.name} subtitle={badge.id} />
      <DetailActions>
        <DetailAction
          label="Dupliquer"
          icon={<CopyPlusIcon aria-hidden />}
          locked={rights.create ? null : LOCKS.create}
          onClick={() => panel.create(copyOfBadge(badge))}
        />
        <DetailAction
          label="Supprimer"
          icon={<Trash2Icon aria-hidden />}
          variant="destructive"
          locked={rights.delete ? null : LOCKS.delete}
          confirm={removal.confirm}
          onClick={removal.run}
        />
      </DetailActions>
      <DetailSection title="Badge">
        <DetailFields>
          <DetailField
            label="Nom"
            icon={<TypeIcon />}
            edit={{ ...fromRule(BADGE_RULES.name), value: badge.name, locked, onSave: (next) => saveBadgeWith(badge, { name: next?.trim() ?? "" }) }}
          />
        </DetailFields>
        <DetailColumnFields row={badge} columns={columns} ids={["id"]} />
        <DetailFields>
          <DetailField
            label="Description"
            icon={<StickyNoteIcon />}
            stacked
            edit={{ ...fromRule(BADGE_RULES.description), value: badge.description, multiline: true, locked, onSave: (next) => saveBadgeWith(badge, { description: next?.trim() ?? "" }) }}
          />
        </DetailFields>
        <DetailColumnFields row={badge} columns={columns} ids={["theme", "status", "active"]} />
        <DetailFields>
          <DetailField label="Position" icon={<ArrowDownUpIcon />}>
            {badge.position}
          </DetailField>
        </DetailFields>
        <DetailColumnFields row={badge} columns={columns} ids={["createdAt"]} />
      </DetailSection>
      <DetailSectionForm<Objective>
        title="Objectif"
        initial={objectiveOf(badge)}
        rules={BADGE_RULES}
        locked={locked}
        onSubmit={(objective) => saveBadgeWith(badge, storedObjective(objective))}
      >
        {(form) => {
          const unit = form.values.metric ? METRICS[form.values.metric].unit : undefined;
          return (
            <>
              <DetailColumnFields
                row={badge}
                columns={columns}
                ids={[
                  { id: "metric", edit: form.bind("metric", { kind: "select", options: METRIC_OPTIONS }) },
                  { id: "family", edit: form.bind("family", { kind: "select", options: FAMILY_OPTIONS }) },
                ]}
              />
              <DetailFields>
                <DetailField
                  label="Objectif"
                  icon={<FlagIcon />}
                  edit={form.bind("target", { kind: "number", unit, required: form.values.tiers.length === 0 })}
                />
                <DetailField
                  label="Paliers"
                  icon={<ListOrderedIcon />}
                  edit={form.bind("tiers", { kind: "tags", placeholder: "Un défi obtenu une fois : son objectif est le dernier palier", validate: tiersError })}
                />
              </DetailFields>
            </>
          );
        }}
      </DetailSectionForm>
      <DetailSection title="Apparence">
        <DetailColumnFields row={badge} columns={columns} ids={["icon", "backgroundColor"]} />
      </DetailSection>
      <DetailSection title="Usage">
        <DetailColumnFields row={badge} columns={columns} ids={["favorites", "profiles"]} />
      </DetailSection>
    </>
  );
}

/** A badge to create, blank or copied: nothing saved before « Créer ». Active once created, added at the end of the catalog. */
export function BadgeCreate({
  themes,
  initial,
  onCancel,
  onCreated,
}: {
  themes: AdminBadgeTheme[];
  initial?: Partial<BadgeDraft>;
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const columns = useMemo(() => badgeColumns(themes, true), [themes]);
  return (
    <DetailForm<BadgeDraft>
      initial={{ ...BLANK, ...initial }}
      rules={BADGE_RULES}
      onSubmit={async (draft) => {
        const body: CreateBadgeRequest = {
          id: draft.id ?? "",
          name: draft.name ?? "",
          description: draft.description ?? "",
          themeId: draft.themeId,
          icon: draft.icon ?? BADGE_ICON_KEYS[0],
          backgroundColor: draft.backgroundColor,
          ...storedObjective(draft),
        };
        const result = await createBadge(body);
        if (result.ok) bumpCatalog();
        return result;
      }}
      onCancel={onCancel}
      onCreated={(created) => onCreated(created.id!)}
      submitLabel="Créer le badge"
    >
      {(form) => {
        const { values } = form;
        const unit = values.metric ? METRICS[values.metric].unit : undefined;
        return (
          <>
            <AdminBadgeBanner
              badge={{ icon: values.icon ?? BADGE_ICON_KEYS[0], family: values.family ?? "all", tiers: null, backgroundColor: values.backgroundColor }}
              className="h-40 shrink-0"
            />
            <DetailHeader
              title={values.name?.trim() || "Nouveau badge"}
              subtitle="Actif dès sa création, ajouté en fin de catalogue."
            />
            <DetailSection title="Badge">
              <DetailFields>
                <DetailField label="Nom" icon={<TypeIcon />} edit={form.bind("name", { kind: "text", placeholder: "Marathon" })} />
                <DetailField label="Identifiant" icon={<FingerprintIcon />} edit={form.bind("id", { kind: "text", placeholder: "Minuscules, chiffres et _ ; définitif" })} />
                <DetailField label="Description" icon={<StickyNoteIcon />} stacked edit={form.bind("description", { kind: "text", multiline: true })} />
              </DetailFields>
              <DetailColumnFields
                columns={columns}
                ids={[{ id: "theme", edit: form.bind("themeId", { kind: "select", options: themeOptions(themes), noneLabel: "Sans collection" }) }]}
              />
            </DetailSection>
            <DetailSection title="Objectif">
              <DetailColumnFields
                columns={columns}
                ids={[
                  { id: "metric", edit: form.bind("metric", { kind: "select", options: METRIC_OPTIONS }) },
                  { id: "family", edit: form.bind("family", { kind: "select", options: FAMILY_OPTIONS }) },
                ]}
              />
              <DetailFields>
                <DetailField
                  label="Objectif"
                  icon={<FlagIcon />}
                  edit={form.bind("target", { kind: "number", unit, required: values.tiers.length === 0 })}
                />
                <DetailField
                  label="Paliers"
                  icon={<ListOrderedIcon />}
                  edit={form.bind("tiers", { kind: "tags", placeholder: "Un défi obtenu une fois : son objectif est le dernier palier", validate: tiersError })}
                />
              </DetailFields>
            </DetailSection>
            <DetailSection title="Apparence">
              <DetailColumnFields
                columns={columns}
                ids={[
                  { id: "icon", edit: form.bind("icon", { kind: "icon" }) },
                  { id: "backgroundColor", edit: form.bind("backgroundColor", { kind: "color", noneLabel: "Fond par défaut" }) },
                ]}
              />
            </DetailSection>
          </>
        );
      }}
    </DetailForm>
  );
}
