"use client";

import { type PublicReleaseNote, RELEASE_NOTE_SECTIONS, type ReleaseNoteSection } from "@kilotrace/shared";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback } from "react";

/** The texts of the PDF, translated by the caller. */
export interface ReleaseNotePdfLabels {
  eyebrow: string;
  date: string;
  title: string;
  sections: Record<ReleaseNoteSection, string>;
  footer: string;
}

/** An image of the site as a JPEG data URL, which the PDF reads (unlike WebP); null when it fails. */
async function asJpeg(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}

/**
 * Builds the PDF of a note in the browser and downloads it as
 * `kilotrace-v<version>.pdf`. The PDF library is loaded on the first call
 * only.
 */
export async function downloadReleaseNotePdf(note: PublicReleaseNote, labels: ReleaseNotePdfLabels): Promise<void> {
  const [{ pdf }, { ReleaseNotePdf }, banner] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./release-note-pdf-document"),
    note.bannerUrl ? asJpeg(note.bannerUrl) : Promise.resolve(null),
  ]);
  const blob = await pdf(<ReleaseNotePdf note={note} banner={banner} labels={labels} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kilotrace-v${note.version}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads the PDF of a note, its texts those of the site. */
export function useReleaseNotePdf(): (note: PublicReleaseNote) => Promise<void> {
  const t = useTranslations("releaseNotes");
  const format = useFormatter();
  return useCallback(
    (note) =>
      downloadReleaseNotePdf(note, {
        eyebrow: t("title"),
        date: format.dateTime(new Date(note.releasedAt), { dateStyle: "long" }),
        title: note.title?.trim() || t("version", { version: note.version }),
        sections: Object.fromEntries(RELEASE_NOTE_SECTIONS.map((section) => [section, t(`sections.${section}`)])) as Record<ReleaseNoteSection, string>,
        footer: t("pdfFooter"),
      }),
    [t, format],
  );
}
