"use client";

import { defaultDisplayOf, type PublicReleaseNote, type ReleaseNoteDisplay, RELEASE_VERSION_PATTERN, RELEASE_NOTE_SECTIONS, type ReleaseNoteSection } from "@kilotrace/shared";
import { type AdminReleaseNote, RELEASE_NOTE_BANNER_MAX_BYTES, RELEASE_NOTE_BANNER_TYPES, RELEASE_NOTE_RULES } from "@kilotrace/shared/admin";
import { usePreview } from "@/components/admin/detail/use-preview";
import { useReleaseNotePdf } from "@/components/release-notes/download-release-note-pdf";
import { toast } from "sonner";
import { BellRingIcon, EyeIcon, FileDownIcon, ReceiptTextIcon, TagIcon, TextIcon, Trash2Icon, TypeIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DetailAction,
  DetailActions,
  DetailColumnFields,
  DetailCover,
  DetailField,
  DetailFields,
  DetailForm,
  DetailHeader,
  DetailLoader,
  DetailMedia,
  DetailSection,
  DetailSkeleton,
  fromRule,
  type RowPanelControls,
} from "@/components/admin/detail";
import { formatDateTime } from "@/components/admin/data-table";
import { RELEASE_NOTE_SECTION_LOOKS } from "@/components/release-notes/release-note-article";
import { createReleaseNote, loadReleaseNote, type ReleaseNoteDraft } from "./actions";
import { CurrentMark, deleteOf, displayOptions, LOCKS, stepOf, STEP_ICONS, releaseNoteColumns, type ReleaseNoteRights, saveNote, STATE_HINTS, STATES, useReleaseNotesVersion, bumpReleaseNotes } from "./release-note-bits";
import { ReleaseNotePreview } from "./release-note-preview";

/** The names, hints and placeholders of the parts of a note. */
export const SECTION_FIELDS: Record<ReleaseNoteSection, { label: string; placeholder: string }> = {
  new: { label: "Nouveautés", placeholder: "- **Carte** : les gares s'affichent dès le zoom 11" },
  improved: { label: "Améliorations", placeholder: "- Le tableau de bord charge deux fois plus vite" },
  fixed: { label: "Corrections", placeholder: "- Les tuiles d'un trajet en ferry ne sont plus comptées" },
  other: { label: "Autres changements", placeholder: "Tout ce qui ne rentre pas ailleurs : maintenance, conditions…" },
};

const SectionIcon = ({ section }: { section: ReleaseNoteSection }) => {
  const Icon = RELEASE_NOTE_SECTION_LOOKS[section].icon;
  return <Icon />;
};

/** The note as the users get it, from the row or the draft. */
export const publicOf = (note: Pick<AdminReleaseNote, "version" | "display" | "title" | "summary" | "sections" | "bannerUrl"> & { releasedAt: string | null }): PublicReleaseNote => ({
  version: note.version,
  bannerUrl: note.bannerUrl,
  display: note.display,
  releasedAt: note.releasedAt ?? new Date().toISOString(),
  title: note.title,
  summary: note.summary,
  sections: note.sections,
});

/** Downloads the PDF of a note, told by a toast while it is built. */
export function pdfOf(note: AdminReleaseNote, download: (note: PublicReleaseNote) => Promise<void>) {
  return toast.promise(download(publicOf(note)), {
    loading: `PDF de la v${note.version} en préparation…`,
    success: `PDF de la v${note.version} téléchargé`,
    error: "Le PDF n'a pas pu être créé",
  });
}

/** The release loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function ReleaseNoteRowPanel({ id, rights, panel }: { id: string; rights: ReleaseNoteRights; panel: RowPanelControls }) {
  const version = useReleaseNotesVersion();
  return (
    <DetailLoader id={id} load={loadReleaseNote} refreshKey={version} skeleton={<DetailSkeleton media actions={3} sections={[7, 6, 4]} />}>
      {(note) => <ReleaseNoteDetail note={note} rights={rights} panel={panel} />}
    </DetailLoader>
  );
}

/** Everything about a release and its note, edited in place, previewed, made ready or back to a draft. */
function ReleaseNoteDetail({ note, rights, panel }: { note: AdminReleaseNote; rights: ReleaseNoteRights; panel: RowPanelControls }) {
  const columns = useMemo(() => releaseNoteColumns(rights.edit), [rights.edit]);
  const [previewing, setPreviewing] = useState(false);
  const locked = rights.edit ? null : LOCKS.edit;
  const step = stepOf(note);
  const download = useReleaseNotePdf();
  const renamable = note.status === "draft" && !note.releasedAt;
  const removal = deleteOf(note, () => panel.removed(note.version));
  const subtitle = note.releasedAt
    ? `Sortie le ${formatDateTime(note.releasedAt)}`
    : "À venir : publiée d'elle-même au premier démarrage du site sur cette version";

  return (
    <>
      <DetailCover image={note.bannerUrl} alt={`Bannière de la v${note.version}`} />
      <DetailHeader
        media={<DetailMedia icon={<ReceiptTextIcon />} color={note.releasedAt ? null : "#3b82f6"} />}
        title={`v${note.version}${note.title ? ` · ${note.title}` : ""}`}
        subtitle={subtitle}
        marks={note.current && <CurrentMark />}
      />
      <DetailActions>
        <DetailAction label="Aperçu" icon={<EyeIcon aria-hidden />} onClick={() => setPreviewing(true)} />
        <DetailAction label="PDF" icon={<FileDownIcon aria-hidden />} onClick={() => pdfOf(note, download)} />
        <DetailAction
          label={step.label}
          icon={STEP_ICONS[step.kind]}
          variant={step.kind === "publish" ? "save" : step.kind === "disable" ? "destructive" : "outline"}
          locked={rights.publish ? step.lock : LOCKS.publish}
          confirm={step.confirm}
          onClick={step.run}
        />
        <DetailAction
          label="Supprimer"
          icon={<Trash2Icon aria-hidden />}
          variant="destructive"
          locked={note.releasedAt ? LOCKS.released : rights.delete ? null : LOCKS.delete}
          confirm={removal.confirm}
          onClick={removal.run}
        />
      </DetailActions>
      <DetailSection title="Diffusion" pill={{ label: STATES[note.state].label, tone: STATES[note.state].tone }}>
        <p className="text-sm text-muted-foreground">{STATE_HINTS[note.state]}</p>
        <DetailColumnFields
          row={note}
          columns={columns}
          ids={[
            {
              id: "version",
              edit: {
                kind: "text",
                ...fromRule(RELEASE_NOTE_RULES.version),
                value: note.version,
                required: true,
                placeholder: "1.2.3 ou 1.2.3-beta.1",
                locked: !rights.edit ? LOCKS.edit : renamable ? null : LOCKS.renamed,
                onSave: async (next) => {
                  const to = next?.trim() ?? "";
                  if (to === note.version) return { ok: true, message: "" };
                  const result = await saveNote(note, { version: to });
                  if (result.ok) panel.renamed(note.version, to);
                  return result;
                },
              },
            },
            "state",
            { id: "display", edit: { kind: "select", value: note.display, options: displayOptions(note.version), required: true, locked, onSave: (display) => saveNote(note, { display: (display ?? defaultDisplayOf(note.version)) as AdminReleaseNote["display"] }) } },
            "releasedAt",
            "concerned",
            "seen",
            "rate",
          ]}
        />
        <DetailFields>
          <DetailField label="Notifiés le" icon={<BellRingIcon />} copy={note.notifiedAt ? formatDateTime(note.notifiedAt) : null}>
            {note.notifiedAt && formatDateTime(note.notifiedAt)}
          </DetailField>
        </DetailFields>
      </DetailSection>
      <DetailSection title="Note">
        <DetailColumnFields row={note} columns={columns} ids={["banner", "title", { id: "summary", stacked: true }]} />
        <DetailFields>
          {RELEASE_NOTE_SECTIONS.map((section) => (
            <DetailField
              key={section}
              label={SECTION_FIELDS[section].label}
              icon={<SectionIcon section={section} />}
              stacked
              edit={{
                kind: "markdown",
                highlight: true,
                ...fromRule(RELEASE_NOTE_RULES[section]),
                value: note.sections[section],
                placeholder: SECTION_FIELDS[section].placeholder,
                locked,
                onSave: (body) => saveNote(note, { [section]: body?.trim() || null }),
              }}
            />
          ))}
        </DetailFields>
      </DetailSection>
      <DetailSection title="Suivi">
        <DetailColumnFields row={note} columns={columns} ids={["updatedAt", "updatedBy", "createdAt"]} />
      </DetailSection>
      <ReleaseNotePreview key={`${previewing}`} note={publicOf(note)} open={previewing} onOpenChange={setPreviewing} />
    </>
  );
}

const BLANK: ReleaseNoteDraft = { version: null, display: null, title: null, summary: null, new: null, improved: null, fixed: null, other: null, banner: null };

/** A note written ahead for a version not out yet: a draft until made ready, nothing saved before « Créer ». */
export function ReleaseNoteCreate({ initial, currentVersion, onCancel, onCreated }: { initial?: Partial<ReleaseNoteDraft>; currentVersion: string; onCancel: () => void; onCreated: (id: string) => void }) {
  const [previewing, setPreviewing] = useState(false);
  return (
    <DetailForm<ReleaseNoteDraft>
      initial={{ ...BLANK, ...initial }}
      rules={RELEASE_NOTE_RULES}
      onSubmit={async (draft) => {
        const result = await createReleaseNote(draft);
        if (result.ok) bumpReleaseNotes();
        return result;
      }}
      onCancel={onCancel}
      onCreated={(created) => onCreated(created.id!)}
      submitLabel="Créer le brouillon"
    >
      {(form) => {
        const version = form.values.version?.trim() || null;
        const display = form.values.display ?? (version ? defaultDisplayOf(version) : "notification");
        return (
          <>
            <DetailCover image={form.values.banner} />
            <DetailHeader
              media={<DetailMedia icon={<ReceiptTextIcon />} color="#3b82f6" />}
              title={version ? `v${version}` : "Nouvelle note"}
              subtitle={`Pour une version pas encore sortie (en ligne : v${currentVersion}). Publiée d'elle-même à sa sortie, une fois prête.`}
              actions={<DetailAction label="Aperçu" icon={<EyeIcon aria-hidden />} disabled={!version} onClick={() => setPreviewing(true)} />}
            />
            <DetailSection title="Version">
              <DetailFields>
                <DetailField
                  label="Version"
                  icon={<TagIcon />}
                  edit={form.bind("version", {
                    kind: "text",
                    placeholder: "Par exemple 0.3.0",
                    // The display follows the impact of the version until picked.
                    onChange: (next) => {
                      if (!form.touched("display") && typeof next === "string" && RELEASE_VERSION_PATTERN.test(next.trim())) form.set("display", defaultDisplayOf(next.trim()));
                    },
                  })}
                />
              </DetailFields>
              <DetailColumnFields
                columns={releaseNoteColumns(true)}
                ids={[
                  { id: "display", edit: form.bind("display", { kind: "select", options: displayOptions(version) }) },
                  { id: "banner", edit: form.bind("banner", { kind: "image", accept: RELEASE_NOTE_BANNER_TYPES.join(","), maxSize: RELEASE_NOTE_BANNER_MAX_BYTES, noneLabel: "Retirer la bannière" }) },
                ]}
              />
            </DetailSection>
            <DetailSection title="Note">
              <DetailFields>
                <DetailField label="Titre" icon={<TypeIcon />} edit={form.bind("title", { kind: "text", placeholder: "Une carte plus rapide" })} />
                <DetailField label="Résumé" icon={<TextIcon />} stacked edit={form.bind("summary", { kind: "text", multiline: true, placeholder: "Une ou deux phrases : le bandeau, la notification et le haut de la popup" })} />
                {RELEASE_NOTE_SECTIONS.map((section) => (
                  <DetailField
                    key={section}
                    label={SECTION_FIELDS[section].label}
                    icon={<SectionIcon section={section} />}
                    stacked
                    edit={form.bind(section, { kind: "markdown", highlight: true, placeholder: SECTION_FIELDS[section].placeholder })}
                  />
                ))}
              </DetailFields>
            </DetailSection>
            {version && (
              <DraftPreview key={`${previewing}`} draft={form.values} version={version} display={display} open={previewing} onOpenChange={setPreviewing} />
            )}
          </>
        );
      }}
    </DetailForm>
  );
}

/** The draft as the users would get it, its banner picked shown from the file. */
function DraftPreview({ draft, version, display, open, onOpenChange }: { draft: ReleaseNoteDraft; version: string; display: ReleaseNoteDisplay; open: boolean; onOpenChange: (open: boolean) => void }) {
  const bannerUrl = usePreview(draft.banner);
  return (
    <ReleaseNotePreview
      note={publicOf({
        version,
        display,
        releasedAt: null,
        bannerUrl: bannerUrl ?? null,
        title: draft.title,
        summary: draft.summary,
        sections: { new: draft.new, improved: draft.improved, fixed: draft.fixed, other: draft.other },
      })}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
