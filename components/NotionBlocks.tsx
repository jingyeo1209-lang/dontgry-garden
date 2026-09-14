import type { ReactNode } from "react";
import Link from "next/link";
import type { NotionBlock } from "@/lib/notion";
import {
  extractNotionFileUrl,
  getBlockChildren,
  toProxiedBlockMediaUrl,
  toProxiedMediaUrl,
} from "@/lib/notion";
import { normalizePageId } from "@/lib/categories";
import { AdSlot } from "@/components/AdSlot";
import { NotionCode } from "@/components/NotionCode";
import { renderNotionRichText, type NotionRichTextItem } from "@/components/NotionRichText";

async function renderNestedBlocks(
  blockId: string,
  skipImageBlockIds: string[] = []
) {
  const children = await getBlockChildren(blockId);
  if (!children.length) return null;
  return (
    <NotionBlocks
      blocks={children}
      insertAdAfter={null}
      skipImageBlockIds={skipImageBlockIds}
      nested
    />
  );
}

async function ChildBlocks({
  block,
  skipImageBlockIds = [],
}: {
  block: NotionBlock;
  skipImageBlockIds?: string[];
}) {
  if (!("id" in block)) return null;
  return renderNestedBlocks(block.id, skipImageBlockIds);
}

function notionImageFallback(label: string, detail: string) {
  return (
    <figure className="notion-figure notion-figure-error">
      <p className="notion-image-fallback">
        {label}: {detail}
      </p>
    </figure>
  );
}

async function Block({
  block,
  skipImageBlockIds = [],
}: {
  block: NotionBlock;
  skipImageBlockIds?: string[];
}) {
  if (!("type" in block)) return null;
  const type = block.type;
  // @ts-expect-error Notion block union
  const data = block[type];

  switch (type) {
    case "paragraph": {
      const rich = renderNotionRichText(data?.rich_text);
      const nested =
        "id" in block ? await renderNestedBlocks(block.id, skipImageBlockIds) : null;
      return (
        <>
          <p className={rich ? "notion-p" : "notion-p notion-p-empty"}>{rich}</p>
          {nested}
        </>
      );
    }
    case "heading_1":
    case "heading_2":
    case "heading_3": {
      const Tag = type === "heading_1" ? "h1" : type === "heading_2" ? "h2" : "h3";
      const cls = type === "heading_1" ? "notion-h1" : type === "heading_2" ? "notion-h2" : "notion-h3";
      const nested =
        "id" in block && "has_children" in block && block.has_children
          ? await renderNestedBlocks(block.id, skipImageBlockIds)
          : null;
      return (
        <>
          <Tag className={cls}>{renderNotionRichText(data?.rich_text)}</Tag>
          {nested}
        </>
      );
    }
    case "bulleted_list_item":
      return (
        <li className="notion-li">
          {renderNotionRichText(data?.rich_text)}
          <ChildBlocks block={block} skipImageBlockIds={skipImageBlockIds} />
        </li>
      );
    case "numbered_list_item":
      return (
        <li className="notion-li">
          {renderNotionRichText(data?.rich_text)}
          <ChildBlocks block={block} skipImageBlockIds={skipImageBlockIds} />
        </li>
      );
    case "to_do":
      return (
        <>
          <label className="notion-todo">
            <input type="checkbox" checked={Boolean(data?.checked)} readOnly />
            <span>{renderNotionRichText(data?.rich_text)}</span>
          </label>
          <ChildBlocks block={block} skipImageBlockIds={skipImageBlockIds} />
        </>
      );
    case "quote":
      return (
        <blockquote className="notion-quote">
          {renderNotionRichText(data?.rich_text)}
          <ChildBlocks block={block} skipImageBlockIds={skipImageBlockIds} />
        </blockquote>
      );
    case "callout": {
      const nested =
        "id" in block ? await renderNestedBlocks(block.id, skipImageBlockIds) : null;
      const color = typeof data?.color === "string" ? data.color : "gray_background";
      const colorClass =
        color && color !== "default"
          ? `notion-callout-${color.replace(/_/g, "-")}`
          : "notion-callout-gray-background";
      const emoji =
        typeof data?.icon?.emoji === "string" && data.icon.emoji.trim()
          ? data.icon.emoji
          : null;
      return (
        <div className={`notion-callout ${colorClass}${emoji ? "" : " notion-callout-plain"}`}>
          {emoji ? <span className="notion-callout-icon">{emoji}</span> : null}
          <div className="notion-callout-body">
            {renderNotionRichText(data?.rich_text)}
            {nested}
          </div>
        </div>
      );
    }
    case "code":
      return (
        <NotionCode
          text={(data?.rich_text || [])
            .map((item: NotionRichTextItem) => item.plain_text || "")
            .join("")}
        />
      );
    case "divider":
      return <hr className="notion-hr" />;
    case "image": {
      const blockId = "id" in block ? normalizePageId(block.id) : "";
      if (blockId && skipImageBlockIds.includes(blockId)) return null;
      const raw = extractNotionFileUrl(data);
      const src =
        (raw && blockId ? toProxiedMediaUrl(raw, blockId) : null) ??
        (blockId ? toProxiedBlockMediaUrl(blockId) : null);
      const caption = renderNotionRichText(data?.caption);
      if (!src) {
        return notionImageFallback(
          "이미지를 불러올 수 없습니다",
          blockId ? `block ${blockId}` : "missing block id"
        );
      }
      return (
        <figure className="notion-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" loading="lazy" />
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      );
    }
    case "bookmark":
    case "link_preview":
      return data?.url ? (
        <p className="notion-p">
          <a href={data.url} target="_blank" rel="noopener noreferrer">
            {renderNotionRichText(data?.caption) || data.url}
          </a>
        </p>
      ) : null;
    case "embed":
    case "video":
      return data?.external?.url || data?.url ? (
        <p className="notion-p">
          <a
            href={data.external?.url || data.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            미디어 열기
          </a>
        </p>
      ) : null;
    case "toggle": {
      const children = "id" in block ? await getBlockChildren(block.id) : [];
      return (
        <details className="notion-toggle">
          <summary>{renderNotionRichText(data?.rich_text)}</summary>
          <div className="notion-toggle-body">
            <NotionBlocks
              blocks={children}
              insertAdAfter={null}
              skipImageBlockIds={skipImageBlockIds}
              nested
            />
          </div>
        </details>
      );
    }
    case "column_list": {
      const columns = "id" in block ? await getBlockChildren(block.id) : [];
      return (
        <div className="notion-columns">
          {await Promise.all(
            columns.map((col) => (
              <Block key={col.id} block={col} skipImageBlockIds={skipImageBlockIds} />
            ))
          )}
        </div>
      );
    }
    case "column": {
      const children = "id" in block ? await getBlockChildren(block.id) : [];
      return (
        <div className="notion-column">
          <NotionBlocks
            blocks={children}
            insertAdAfter={null}
            skipImageBlockIds={skipImageBlockIds}
            nested
          />
        </div>
      );
    }
    case "table": {
      const rows = "id" in block ? await getBlockChildren(block.id) : [];
      const hasColumnHeader = Boolean(data?.has_column_header);
      return (
        <div className="notion-table-wrap">
          <table className="notion-table">
            <tbody>
              {rows.map((row, rowIndex) => {
                if (!("type" in row) || row.type !== "table_row") return null;
                const cells = row.table_row?.cells ?? [];
                return (
                  <tr key={row.id}>
                    {cells.map((cell: NotionRichTextItem[], cellIndex: number) => {
                      const CellTag =
                        hasColumnHeader && rowIndex === 0 ? "th" : "td";
                      return (
                        <CellTag key={cellIndex}>{renderNotionRichText(cell)}</CellTag>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    case "synced_block": {
      const sourceId = data?.synced_from?.block_id;
      const children = await getBlockChildren(sourceId ?? block.id);
      return (
        <NotionBlocks
          blocks={children}
          insertAdAfter={null}
          skipImageBlockIds={skipImageBlockIds}
          nested
        />
      );
    }
    case "link_to_page": {
      const pageId = data?.page_id;
      if (!pageId) return null;
      return (
        <p className="notion-p">
          <Link href={`/${normalizePageId(pageId)}`}>관련 페이지 보기</Link>
        </p>
      );
    }
    case "file":
    case "pdf": {
      const blockId = "id" in block ? block.id : "";
      const raw = extractNotionFileUrl(data);
      const href =
        (raw && blockId ? toProxiedMediaUrl(raw, blockId) : null) ??
        (blockId ? toProxiedBlockMediaUrl(blockId) : null);
      const name = data?.name || data?.caption?.[0]?.plain_text || "파일 다운로드";
      if (!href) {
        return notionImageFallback(
          "파일을 불러올 수 없습니다",
          blockId ? `block ${blockId}` : "missing block id"
        );
      }
      if (!href) return null;
      return (
        <p className="notion-p">
          <a href={href} target="_blank" rel="noopener noreferrer">
            {name}
          </a>
        </p>
      );
    }
    case "equation":
      return (
        <p className="notion-p notion-equation">
          <code>{data?.expression}</code>
        </p>
      );
    default:
      if (data?.rich_text) {
        return (
          <>
            <p className="notion-p">{renderNotionRichText(data.rich_text)}</p>
            <ChildBlocks block={block} skipImageBlockIds={skipImageBlockIds} />
          </>
        );
      }
      return <ChildBlocks block={block} skipImageBlockIds={skipImageBlockIds} />;
  }
}

function groupListItems(blocks: NotionBlock[]) {
  const groups: { kind: "ul" | "ol" | "single"; items: NotionBlock[] }[] = [];
  for (const block of blocks) {
    if (!("type" in block)) {
      groups.push({ kind: "single", items: [block] });
      continue;
    }
    if (block.type === "bulleted_list_item") {
      const last = groups[groups.length - 1];
      if (last?.kind === "ul") last.items.push(block);
      else groups.push({ kind: "ul", items: [block] });
    } else if (block.type === "numbered_list_item") {
      const last = groups[groups.length - 1];
      if (last?.kind === "ol") last.items.push(block);
      else groups.push({ kind: "ol", items: [block] });
    } else {
      groups.push({ kind: "single", items: [block] });
    }
  }
  return groups;
}

type Props = {
  blocks: NotionBlock[];
  /** Insert in-article ad after this many top-level blocks (e.g. 3). */
  insertAdAfter?: number | null;
  /** Body image blocks already shown as cover fallback — omit from article body. */
  skipImageBlockIds?: string[];
  /** Nested renderer: skip the outer `.notion-body` wrapper. */
  nested?: boolean;
};

export async function NotionBlocks({
  blocks,
  insertAdAfter = 3,
  skipImageBlockIds = [],
  nested = false,
}: Props) {
  const groups = groupListItems(blocks);
  const out: ReactNode[] = [];
  let renderedBlocks = 0;

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    if (group.kind === "ul") {
      out.push(
        <ul key={`ul-${gi}`} className="notion-ul">
          {await Promise.all(
            group.items.map(async (b) => (
              <Block key={b.id} block={b} skipImageBlockIds={skipImageBlockIds} />
            ))
          )}
        </ul>
      );
      renderedBlocks += group.items.length;
    } else if (group.kind === "ol") {
      out.push(
        <ol key={`ol-${gi}`} className="notion-ol">
          {await Promise.all(
            group.items.map(async (b) => (
              <Block key={b.id} block={b} skipImageBlockIds={skipImageBlockIds} />
            ))
          )}
        </ol>
      );
      renderedBlocks += group.items.length;
    } else {
      const b = group.items[0];
      out.push(<Block key={b.id} block={b} skipImageBlockIds={skipImageBlockIds} />);
      renderedBlocks += 1;
    }

    if (insertAdAfter != null && renderedBlocks === insertAdAfter) {
      out.push(<AdSlot key="in-article-ad" unit="inArticle" />);
    }
  }

  if (nested) return <>{out}</>;
  return <div className="notion-body">{out}</div>;
}
