import type { ReactNode } from "react";

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
      node = (
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
