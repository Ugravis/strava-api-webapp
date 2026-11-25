"use client";

import { TARGET_LOCALES, type TargetLocale, type Translations } from "@kilotrace/shared";
import type { FieldRule } from "@kilotrace/shared/rules";
import { LanguagesIcon } from "lucide-react";
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
 * the site (the source given as a hint). « Traduire les manquantes » fills
 * every field left empty in every language through DeepL from the source,
 * never one typed; each one stays editable by hand.
 */
export function DetailTranslations<F extends string>({
  fields,
  source,
  translations,
  onSave,
  onFill,
  locked,
}: {
  fields: DetailTranslationField<F>[];
  /** The French values, those of the fields above. */
  source: Partial<Record<F, string | null>>;
  translations: Translations<F>;
  onSave: (locale: TargetLocale, field: F, value: string | null) => Promise<ActionResult | void>;
  onFill: () => Promise<ActionResult>;
  locked?: string | null;
}) {
  const [tab, setTab] = useState<TargetLocale>(TARGET_LOCALES[0]);
  const wanted = fields.filter((field) => source[field.name]?.trim());
  const missingIn = (locale: TargetLocale) => wanted.filter((field) => !translations[locale]?.[field.name]).length;
  const missing = TARGET_LOCALES.reduce((total, locale) => total + missingIn(locale), 0);

  return (
    <DetailSection
      title="Traductions"
      pill={missing > 0 ? { label: `${missing} à traduire`, tone: "amber" } : { label: "Complètes", tone: "green" }}
      aside={
        <DetailAction
          label="Traduire les manquantes (DeepL)"
          icon={<LanguagesIcon aria-hidden />}
          locked={locked}
          disabled={missing === 0}
          onClick={async () => {
            const result = await onFill();
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
              {missingIn(locale) > 0 && <span className="size-1.5 rounded-full bg-amber-500" aria-label="Incomplète" />}
            </TabsTrigger>
          ))}
        </TabsList>
        {TARGET_LOCALES.map((locale) => (
          <TabsContent key={locale} value={locale} className="pt-2">
            <DetailFields>
              {fields.map((field) => (
                <DetailField
                  key={field.name}
                  label={field.label}
                  icon={field.icon}
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
              ))}
            </DetailFields>
          </TabsContent>
        ))}
      </Tabs>
    </DetailSection>
  );
}
