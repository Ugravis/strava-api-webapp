"use client";

import { staleTranslations, TARGET_LOCALES, type TargetLocale, type TranslationSources, type Translations } from "@kilotrace/shared";
import type { FieldRule } from "@kilotrace/shared/rules";
import { LanguagesIcon, TriangleAlertIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kilotrace/ui/components/ui/tabs";
import { DetailAction } from "./actions";
import { DetailField, DetailFields } from "./field";
import { fromRule } from "./field-edit";
import { DetailSection } from "./section";

/** The languages a content is translated into, named in French as the back office speaks it. */
const LOCALE_LABELS: Record<TargetLocale, string> = {
  en: "Anglais",
  it: "Italien",
  es: "Espagnol",
  de: "Allemand",
};

/** A field of a content translated, as its source is shown above in the detail. */
export interface DetailTranslationField<F extends string> {
  name: F;
  label: string;
  icon?: ReactNode;
  /** `markdown` for a long text drawn as such, `text` otherwise. */
  kind?: "text" | "markdown";
  multiline?: boolean;
  /** A markdown with the highlighter. */
  highlight?: boolean;
  /** The rule of its source field: its length; a translation is never required. */
  rule?: FieldRule;
}

/**
 * The translations of a content written in French: a tab per language, its
 * fields edited in place, empty ones falling back on English then French on
 * the site (the source given as a hint). A translation whose French changed
 * since it was made is « à revoir », told on its field, its tab and the pill.
 * The DeepL button translates the fields empty or to review; when none is,
 * it translates everything again, those typed by hand included, once
 * confirmed. Each field stays editable by hand, typing it following the
 * French as it is.
 */
export function DetailTranslations<F extends string>({
  fields,
  source,
  translations,
  sources,
  onSave,
  onFill,
  locked,
}: {
  fields: DetailTranslationField<F>[];
  /** The French values, those of the fields above. */
  source: Partial<Record<F, string | null>>;
  translations: Translations<F>;
  /** The French each translation was made from. */
  sources: TranslationSources<F>;
  onSave: (locale: TargetLocale, field: F, value: string | null) => Promise<ActionResult | void>;
  /** `all`: every field again, else those empty or to review. */
  onFill: (all: boolean) => Promise<ActionResult>;
  locked?: string | null;
}) {
  const [tab, setTab] = useState<TargetLocale>(TARGET_LOCALES[0]);
  const wanted = fields.filter((field) => source[field.name]?.trim());
  const stale = staleTranslations(source, translations, sources);
  const missingIn = (locale: TargetLocale) => wanted.filter((field) => !translations[locale]?.[field.name]).length;
  const staleIn = (locale: TargetLocale) => stale[locale]?.length ?? 0;
  const missing = TARGET_LOCALES.reduce((total, locale) => total + missingIn(locale), 0);
  const toReview = TARGET_LOCALES.reduce((total, locale) => total + staleIn(locale), 0);
  const upToDate = missing === 0 && toReview === 0;
  const pending = [missing > 0 && `${missing} à traduire`, toReview > 0 && `${toReview} à revoir`].filter(Boolean).join(" · ");

  return (
    <DetailSection
      title="Traductions"
      pill={upToDate ? { label: "À jour", tone: "green" } : { label: pending, tone: "amber" }}
      aside={
        <DetailAction
          label={upToDate ? "Tout retraduire (DeepL)" : "Traduire les champs vides ou à revoir (DeepL)"}
          icon={<LanguagesIcon aria-hidden />}
          locked={locked}
          confirm={
            upToDate
              ? {
                  title: "Tout retraduire ?",
                  description: "Chaque champ de chaque langue est traduit à nouveau depuis le français par DeepL, y compris ceux saisis à la main.",
                  confirmLabel: "Retraduire",
                  destructive: false,
                }
              : undefined
          }
          onClick={async () => {
            const result = await onFill(upToDate);
            if (result.ok) toast.success(result.message);
            return result;
          }}
        />
      }
    >
      <Tabs value={tab} onValueChange={(value) => setTab(value as TargetLocale)} className="gap-0">
        <TabsList variant="line" className="h-9! w-full justify-start gap-1 overflow-x-auto border-b [scrollbar-width:none]">
          {TARGET_LOCALES.map((locale) => (
            <TabsTrigger key={locale} value={locale} className="flex-none px-2">
              {LOCALE_LABELS[locale]}
              {missingIn(locale) + staleIn(locale) > 0 && <span className="size-1.5 rounded-full bg-amber-500" aria-label="Incomplète ou à revoir" />}
            </TabsTrigger>
          ))}
        </TabsList>
        {TARGET_LOCALES.map((locale) => (
          <TabsContent key={locale} value={locale} className="pt-2">
            <DetailFields>
              {fields.map((field) => {
                const outdated = stale[locale]?.includes(field.name);
                return (
                <DetailField
                  key={field.name}
                  label={outdated ? `${field.label} · à revoir` : field.label}
                  icon={outdated ? <TriangleAlertIcon className="text-amber-500" aria-label="Le français a changé depuis cette traduction" /> : field.icon}
                  stacked={field.kind === "markdown" || field.multiline}
                  edit={{
                    ...fromRule(field.rule && ({ ...field.rule, required: false } as FieldRule)),
                    kind: field.kind ?? "text",
                    ...(field.kind === "markdown" ? { highlight: field.highlight } : { multiline: field.multiline }),
                    placeholder: source[field.name] ?? undefined,
                    value: translations[locale]?.[field.name] ?? null,
                    locked,
                    onSave: (value: string | null) => onSave(locale, field.name, value?.trim() || null),
                  }}
                />
                );
              })}
            </DetailFields>
          </TabsContent>
        ))}
      </Tabs>
    </DetailSection>
  );
}
