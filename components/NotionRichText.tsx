import type { ReactNode } from "react";
import { normalizePageId } from "@/lib/categories";

export type NotionRichTextItem = {
  plain_text: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
};

function notionAnnotationClass(color: string | undefined): string | undefined {
  if (!color || color === "default") return undefined;
  return `notion-annot-${color.replace(/_/g, "-")}`;
}

/** Notion heading mentions use /p/pageId#blockId — rewrite to an in-page anchor. */
export function toInPageHeadingHref(href: string): string | null {
  const hash = href.split("#")[1]?.split("?")[0]?.trim();
  if (!hash) return null;
  const id = normalizePageId(hash);
  if (id.replace(/-/g, "").length !== 32) return null;
  return `#${id}`;
}

export function renderNotionRichText(items: NotionRichTextItem[] | undefined) {
  if (!items?.length) return null;
  return items.map((t, i) => {
    let node: ReactNode = t.plain_text;
    const a = t.annotations;
    if (a?.code) node = <code>{node}</code>;
    if (a?.bold) node = <strong>{node}</strong>;
    if (a?.italic) node = <em>{node}</em>;
    if (a?.strikethrough) node = <s>{node}</s>;
    if (a?.underline) node = <u>{node}</u>;
    if (t.href) {
      const inPage = toInPageHeadingHref(t.href);
      node = inPage ? (
        <a href={inPage}>{node}</a>
      ) : (
        <a href={t.href} target="_blank" rel="noopener noreferrer">
          {node}
        </a>
      );
    }
    const colorClass = notionAnnotationClass(a?.color);
    if (colorClass) {
      node = <span className={colorClass}>{node}</span>;
    }
    return <span key={i}>{node}</span>;
  });
}
