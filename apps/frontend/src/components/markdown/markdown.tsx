import { Fragment, type ReactNode } from "react";

/*
 * A small Markdown, drawn as React elements (never HTML from the text): the
 * titles, lists, quotes and paragraphs of a note, bold, italics, code and
 * links (`http`, `https`, `mailto` only) inside them.
 */

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
const SAFE_LINK = /^(https?:|mailto:)/i;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, at) => {
    if (at % 2 === 0) return part;
    if (part.startsWith("**")) return <strong key={at}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={at} className="rounded bg-muted px-1 font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
    if (part.startsWith("[")) {
      const [, label, href] = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!;
      if (!SAFE_LINK.test(href!)) return label;
      return (
        <a key={at} href={href} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="text-primary underline underline-offset-2">
          {label}
        </a>
      );
    }
    return <em key={at}>{part.slice(1, -1)}</em>;
  });
}

type Block = { type: "h"; level: number; text: string } | { type: "ul" | "ol"; items: string[] } | { type: "quote" | "p"; lines: string[] };

function blocks(source: string): Block[] {
  const found: Block[] = [];
  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    const last = found.at(-1);
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const quote = line.match(/^>\s?(.*)$/);
    if (!line.trim()) found.push({ type: "p", lines: [] });
    else if (heading) found.push({ type: "h", level: heading[1]!.length, text: heading[2]! });
    else if (bullet || numbered) {
      const type = bullet ? "ul" : "ol";
      const text = (bullet ?? numbered)![1]!;
      if (last?.type === type) last.items.push(text);
      else found.push({ type, items: [text] });
    } else if (quote) {
      if (last?.type === "quote") last.lines.push(quote[1]!);
      else found.push({ type: "quote", lines: [quote[1]!] });
    } else if (last?.type === "p" && last.lines.length > 0) last.lines.push(line);
    else found.push({ type: "p", lines: [line] });
  }
  return found.filter((block) => !("lines" in block) || block.lines.length > 0);
}

const lines = (all: string[]) => all.map((line, at) => <Fragment key={at}>{at > 0 && <br />}{inline(line)}</Fragment>);

/** `source` drawn: its blocks stacked, in the size of the text around. */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 py-1 wrap-break-word">
      {blocks(source).map((block, at) => {
        switch (block.type) {
          case "h":
            return <p key={at} className={block.level === 1 ? "text-base font-semibold" : "font-semibold"}>{inline(block.text)}</p>;
          case "ul":
          case "ol": {
            const List = block.type;
            return (
              <List key={at} className={block.type === "ul" ? "list-disc pl-5" : "list-decimal pl-5"}>
                {block.items.map((item, index) => <li key={index}>{inline(item)}</li>)}
              </List>
            );
          }
          case "quote":
            return <blockquote key={at} className="border-l-2 pl-3 text-muted-foreground">{lines(block.lines)}</blockquote>;
          default:
            return <p key={at}>{lines(block.lines)}</p>;
        }
      })}
    </div>
  );
}
