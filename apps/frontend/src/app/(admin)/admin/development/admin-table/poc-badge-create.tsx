"use client";

import { checkField } from "@kilotrace/shared/rules";
import { FootprintsIcon, KeyRoundIcon, StickyNoteIcon, TypeIcon } from "lucide-react";
import { DetailColumnFields, DetailCover, DetailField, DetailFields, DetailForm, DetailHeader, DetailMedia, DetailSection, LucideIconByName } from "@kilotrace/ui/components/admin/detail";
import { BADGES_TABLE, COLLECTION_OPTIONS, COLLECTIONS, type PocCollection, SPORTS } from "./poc-order";
import { BADGE_RULES } from "./poc-rules";
import { createPocBadge } from "./poc-store";

/** A badge being typed: every field may still be empty. */
export interface PocBadgeDraft {
  name: string | null;
  collection: PocCollection | null;
  /** A file picked, or the URL of the badge copied. */
  picture: File | string | null;
  color: string | null;
  icon: string | null;
  threshold: number | null;
  active: boolean;
  availableFrom: string | null;
  endsAt: string | null;
  description: string | null;
  sports: string[];
  keywords: string[];
}

const BLANK: PocBadgeDraft = {
  name: null,
  collection: null,
  picture: null,
  color: null,
  icon: null,
  threshold: null,
  active: true,
  availableFrom: null,
  endsAt: null,
  description: null,
  sports: [],
  keywords: [],
};

/** Beyond, a badge of the collection could never be won. */
const MAX_THRESHOLD: Record<PocCollection, number> = { distance: 40_075, tiles: 10_000, stations: 3_000 };

/**
 * A new badge in the panel, blank or filled from `initial` (a copy): the
 * fields of its detail typed at once, nothing saved before « Créer ». Shows
 * every kind of field, and fields bound to each other: the icon following
 * the collection until picked, the unit and the bounds of the threshold
 * after the collection, the sports of a distance only, required there, an
 * end after the start. Required fields, bounds and formats come from
 * `BADGE_RULES`, the rules the fake server judges by too.
 */
export function PocBadgeCreate({ initial, onCancel, onCreated }: { initial?: Partial<PocBadgeDraft>; onCancel: () => void; onCreated: (id: string) => void }) {
  return (
    <DetailForm
      initial={{ ...BLANK, ...initial }}
      rules={BADGE_RULES}
      onSubmit={createPocBadge}
      onCancel={onCancel}
      onCreated={(created) => onCreated(created.id!)}
      submitLabel="Créer le badge"
    >
      {(form) => {
        const { values } = form;
        const collection = values.collection ? COLLECTIONS[values.collection] : null;
        return (
          <>
            {/* Drawn from the draft as it is typed: the cover of the image picked, as on the detail of a badge. */}
            <DetailCover image={values.picture} />
            <DetailHeader
              media={<DetailMedia icon={<LucideIconByName name={values.icon ?? "medal"} />} color={values.color ?? undefined} />}
              title={values.name?.trim() || "Nouveau badge"}
              subtitle={collection?.label ?? "Brouillon"}
            />
            <DetailSection title="Badge">
              <DetailFields>
                <DetailField
                  label="Nom"
                  icon={<TypeIcon />}
                  edit={form.bind("name", { kind: "text", placeholder: "Marathon" })}
                />
              </DetailFields>
              {/* The fields of the columns of the table: their names and icons, typed in the draft. */}
              <DetailColumnFields
                columns={BADGES_TABLE.columns}
                ids={[
                  {
                    id: "collection",
                    edit: form.bind("collection", {
                      kind: "select",
                      options: COLLECTION_OPTIONS,
                      // The icon of the collection, until one is picked.
                      onChange: (next) => !form.touched("icon") && form.set("icon", next ? COLLECTIONS[next as PocCollection].icon : null),
                    }),
                  },
                  { id: "picture", edit: form.bind("picture", { kind: "image", maxSize: 2 * 1024 * 1024, noneLabel: "Retirer l'image" }) },
                ]}
              />
            </DetailSection>
            <DetailSection title="Apparence">
              <DetailColumnFields
                columns={BADGES_TABLE.columns}
                ids={[
                  { id: "color", edit: form.bind("color", { kind: "color", noneLabel: "Aucune" }) },
                  { id: "icon", edit: form.bind("icon", { kind: "icon" }) },
                ]}
              />
            </DetailSection>
            <DetailSection title="Règle">
              <DetailColumnFields
                columns={BADGES_TABLE.columns}
                ids={[
                  {
                    id: "threshold",
                    // Its unit and its bounds after the collection.
                    edit: form.bind("threshold", {
                      kind: "number",
                      max: values.collection ? MAX_THRESHOLD[values.collection] : undefined,
                      unit: collection?.unit,
                      // Typed within the bounds of a collection, then another one picked.
                      validate: (threshold) =>
                        !values.collection
                          ? "Choisir d'abord une collection."
                          : threshold !== null && threshold > MAX_THRESHOLD[values.collection]
                            ? `Le seuil doit être d'au plus ${MAX_THRESHOLD[values.collection].toLocaleString("fr-FR")}\u00a0${collection!.unit}.`
                            : // Then the shared rule: a whole number from 1.
                              checkField(BADGE_RULES.threshold!, threshold),
                    }),
                  },
                  { id: "active", edit: form.bind("active", { kind: "switch" }) },
                ]}
              />
              {/* A distance only, and then required. */}
              {values.collection === "distance" && (
                <DetailFields>
                  <DetailField label="Sports" icon={<FootprintsIcon />} edit={form.bind("sports", { kind: "multiselect", options: SPORTS, required: true })} />
                </DetailFields>
              )}
            </DetailSection>
            <DetailSection title="Période">
              <DetailColumnFields
                columns={BADGES_TABLE.columns}
                ids={[
                  { id: "availableFrom", edit: form.bind("availableFrom", { kind: "date" }) },
                  {
                    id: "endsAt",
                    edit: form.bind("endsAt", {
                      kind: "date",
                      time: true,
                      min: values.availableFrom ?? undefined,
                    }),
                  },
                ]}
              />
            </DetailSection>
            <DetailSection title="Présentation">
              <DetailFields>
                <DetailField
                  label="Description"
                  icon={<StickyNoteIcon />}
                  stacked
                  edit={form.bind("description", { kind: "markdown", placeholder: "Ce que l'athlète lit sous le badge" })}
                />
                {/* Free values, suggestions offered. */}
                <DetailField
                  label="Mots-clés"
                  icon={<KeyRoundIcon />}
                  edit={form.bind("keywords", { kind: "tags", suggestions: ["course", "vélo", "endurance", "montagne", "ville", "défi"] })}
                />
              </DetailFields>
            </DetailSection>
          </>
        );
      }}
    </DetailForm>
  );
}
