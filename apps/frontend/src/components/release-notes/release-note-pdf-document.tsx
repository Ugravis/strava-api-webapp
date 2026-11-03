import { type PublicReleaseNote, RELEASE_NOTE_SECTIONS, type ReleaseNoteSection } from "@kilotrace/shared";
import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { INLINE_HIGHLIGHT, markdownBlocks, SAFE_LINK } from "@/components/markdown/markdown";

/*
 * A release note as a PDF of A4 pages, in the order of the popup: the
 * banner, « Nouveautés » with its date and version, the title, the summary,
 * then its parts between lines. Drawn by @react-pdf/renderer, loaded only
 * when a PDF is asked for.
 */

const INK = "#18181b";
const MUTED = "#71717a";
const LINE = "#e4e4e7";
const PRIMARY = "#2563eb";

/** The colour of the title of each part, as their icons on the site. */
const SECTION_COLORS: Record<ReleaseNoteSection, string> = { new: "#7c3aed", improved: "#0284c7", fixed: "#059669", other: MUTED };

const styles = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 56, paddingHorizontal: 48, fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.5, color: INK },
  banner: { width: "100%", height: 166, objectFit: "cover", borderRadius: 8, marginBottom: 20 },
  meta: { flexDirection: "row", justifyContent: "space-between", fontSize: 8.5, marginBottom: 6 },
  eyebrow: { fontFamily: "Helvetica-Bold", color: PRIMARY, letterSpacing: 0.8 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 20, lineHeight: 1.25, marginBottom: 6 },
  summary: { fontSize: 11.5, color: MUTED, marginBottom: 6 },
  rule: { borderBottomWidth: 1, borderBottomColor: LINE, marginVertical: 14 },
  section: { gap: 6 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 12.5, marginBottom: 2 },
  heading: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 4 },
  item: { flexDirection: "row", gap: 6 },
  bullet: { width: 12, color: MUTED },
  quote: { borderLeftWidth: 2, borderLeftColor: LINE, paddingLeft: 8, color: MUTED },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  code: { fontFamily: "Courier", fontSize: 9.5, backgroundColor: "#f4f4f5" },
  mark: { backgroundColor: "#fde68a" },
  link: { color: PRIMARY, textDecoration: "underline" },
  footer: { position: "absolute", bottom: 26, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: MUTED },
});

/** The bold, italics, code, links and highlights of a line. */
function inline(text: string): ReactNode[] {
  return text.split(INLINE_HIGHLIGHT).map((part, at) => {
    if (at % 2 === 0) return part;
    if (part.startsWith("==")) return <Text key={at} style={styles.mark}>{inline(part.slice(2, -2))}</Text>;
    if (part.startsWith("**")) return <Text key={at} style={styles.bold}>{part.slice(2, -2)}</Text>;
    if (part.startsWith("`")) return <Text key={at} style={styles.code}>{part.slice(1, -1)}</Text>;
    if (part.startsWith("[")) {
      const [, label, href] = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!;
      return SAFE_LINK.test(href!) ? <Link key={at} src={href!} style={styles.link}>{label}</Link> : label;
    }
    return <Text key={at} style={styles.italic}>{part.slice(1, -1)}</Text>;
  });
}

function Markdown({ source }: { source: string }) {
  return (
    <View style={{ gap: 4 }}>
      {markdownBlocks(source).map((block, at) => {
        switch (block.type) {
          case "h":
            return <Text key={at} style={styles.heading}>{inline(block.text)}</Text>;
          case "ul":
          case "ol":
            return (
              <View key={at} style={{ gap: 2 }}>
                {block.items.map((item, index) => (
                  <View key={index} style={styles.item} wrap={false}>
                    <Text style={styles.bullet}>{block.type === "ul" ? "•" : `${index + 1}.`}</Text>
                    <Text style={{ flex: 1 }}>{inline(item)}</Text>
                  </View>
                ))}
              </View>
            );
          case "quote":
            return <Text key={at} style={styles.quote}>{inline(block.lines.join("\n"))}</Text>;
          default:
            return <Text key={at}>{inline(block.lines.join("\n"))}</Text>;
        }
      })}
    </View>
  );
}

export interface ReleaseNotePdfProps {
  note: PublicReleaseNote;
  /** The banner as a PNG or JPEG data URL: the PDF reads no WebP. */
  banner: string | null;
  /** The texts of the site, already translated. */
  labels: { eyebrow: string; date: string; title: string; sections: Record<ReleaseNoteSection, string>; footer: string };
}

export function ReleaseNotePdf({ note, banner, labels }: ReleaseNotePdfProps) {
  const parts = RELEASE_NOTE_SECTIONS.filter((section) => note.sections[section]?.trim());
  return (
    <Document title={labels.title} author="Kilotrace" subject={`Version ${note.version}`} language="fr">
      <Page size="A4" style={styles.page}>
        {banner && <Image src={banner} style={styles.banner} />}
        <View style={styles.meta}>
          <Text style={styles.eyebrow}>{labels.eyebrow.toUpperCase()}</Text>
          <Text style={{ color: MUTED }}>
            {labels.date} · v{note.version}
          </Text>
        </View>
        <Text style={styles.title}>{labels.title}</Text>
        {note.summary && <Text style={styles.summary}>{note.summary}</Text>}
        {parts.map((section, index) => (
          <View key={section}>
            <View style={index === 0 ? { marginTop: 10 } : styles.rule} />
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: SECTION_COLORS[section] }]}>{labels.sections[section]}</Text>
              <Markdown source={note.sections[section]!} />
            </View>
          </View>
        ))}
        <View style={styles.footer} fixed>
          <Text>{labels.footer}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
