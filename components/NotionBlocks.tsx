import type { ReactNode } from "react";
import Link from "next/link";
import type { NotionBlock, NotionChildMap } from "@/lib/notion";
import {
  extractNotionFileUrl,
  getBlockChildren,
  toProxiedBlockMediaUrl,
  toProxiedMediaUrl,
} from "@/lib/notion";
import { normalizePageId } from "@/lib/categories";
import { AdSlot } from "@/components/AdSlot";
import { NotionCode } from "@/components/NotionCode";
import { NotionTodo } from "@/components/NotionTodo";
import { renderNotionRichText, type NotionRichTextItem } from "@/components/NotionRichText";

type ImagePriority = { used: boolean };

type RenderCtx = {
  childMap?: NotionChildMap;
  skipImageBlockIds: string[];
  imagePriority: ImagePriority;
};

function blockIdOf(block: NotionBlock): string | null {
  return "id" in block ? normalizePageId(block.id) : null;
}

function blockHasChildren(block: NotionBlock): boolean {
  return Boolean("has_children" in block && block.has_children);
}

async function loadChildren(
  block: NotionBlock,
  ctx: RenderCtx,
  sourceId?: string
): Promise<NotionBlock[]> {
  const id = sourceId ? normalizePageId(sourceId) : blockIdOf(block);
  if (!id) return [];
  if (ctx.childMap && id in ctx.childMap) return ctx.childMap[id];
  if (!sourceId && !blockHasChildren(block)) return [];
  return getBlockChildren(id);
}

async function renderNestedBlocks(block: NotionBlock, ctx: RenderCtx, sourceId?: string) {
  const children = await loadChildren(block, ctx, sourceId);
  if (!children.length) return null;
  return (
    <NotionBlocks
      blocks={children}
      insertAdAfter={null}
      skipImageBlockIds={ctx.skipImageBlockIds}
      childMap={ctx.childMap}
      imagePriority={ctx.imagePriority}
      nested
    />
  );
}

async function ChildBlocks({ block, ctx }: { block: NotionBlock; ctx: RenderCtx }) {
  if (!blockHasChildren(block)) {
    const id = blockIdOf(block);
    if (!id || !ctx.childMap?.[id]?.length) return null;
  }
  return renderNestedBlocks(block, ctx);
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

async function Block({ block, ctx }: { block: NotionBlock; ctx: RenderCtx }) {
  if (!("type" in block)) return null;
  const type = block.type;
  // @ts-expect-error Notion block union
  const data = block[type];

  switch (type) {
    case "paragraph": {
      const rich = renderNotionRichText(data?.rich_text);
      const nested = blockHasChildren(block)
        ? await renderNestedBlocks(block, ctx)
        : null;
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
      const nested = blockHasChildren(block)
        ? await renderNestedBlocks(block, ctx)
        : null;
      return (
        <>
          <Tag
            id={blockIdOf(block) ?? undefined}
            className={cls}
          >
            {renderNotionRichText(data?.rich_text)}
          </Tag>
          {nested}
        </>
      );
    }
    case "bulleted_list_item":
      return (
        <li className="notion-li">
          {renderNotionRichText(data?.rich_text)}
          <ChildBlocks block={block} ctx={ctx} />
        </li>
      );
    case "numbered_list_item":
      return (
        <li className="notion-li">
          {renderNotionRichText(data?.rich_text)}
          <ChildBlocks block={block} ctx={ctx} />
        </li>
      );
    case "to_do":
      return (
        <>
          <NotionTodo
            blockId={blockIdOf(block) || ""}
            defaultChecked={Boolean(data?.checked)}
          >
            {renderNotionRichText(data?.rich_text)}
          </NotionTodo>
          <ChildBlocks block={block} ctx={ctx} />
        </>
      );
    case "quote":
      return (
        <blockquote className="notion-quote">
          {renderNotionRichText(data?.rich_text)}
          <ChildBlocks block={block} ctx={ctx} />
        </blockquote>
      );
    case "callout": {
      const nested = blockHasChildren(block)
        ? await renderNestedBlocks(block, ctx)
        : null;
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
      const blockId = blockIdOf(block) || "";
      if (blockId && ctx.skipImageBlockIds.includes(blockId)) return null;
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
      const priority = !ctx.imagePriority.used;
      if (priority) ctx.imagePriority.used = true;
      return (
        <figure className="notion-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
          />
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
            target="_blank" rel="noopener noreferrer"
          >
            미디어 열기
          </a>
        </p>
      ) : null;
    case "toggle": {
      const children = await loadChildren(block, ctx);
      return (
        <details className="notion-toggle">
          <summary>{renderNotionRichText(data?.rich_text)}</summary>
          <div className="notion-toggle-body">
            <NotionBlocks
              blocks={children}
              insertAdAfter={null}
              skipImageBlockIds={ctx.skipImageBlockIds}
              childMap={ctx.childMap}
              imagePriority={ctx.imagePriority}
              nested
            />
          </div>
        </details>
      );
    }
    case "column_list": {
      const columns = await loadChildren(block, ctx);
      return (
        <div className="notion-columns">
          {await Promise.all(
            columns.map((col) => (
              <Block key={"id" in col ? col.id : undefined} block={col} ctx={ctx} />
            ))
          )}
        </div>
      );
    }
    case "column": {
      const children = await loadChildren(block, ctx);
      return (
        <div className="notion-column">
          <NotionBlocks
            blocks={children}
            insertAdAfter={null}
            skipImageBlockIds={ctx.skipImageBlockIds}
            childMap={ctx.childMap}
            imagePriority={ctx.imagePriority}
            nested
          />
        </div>
      );
    }
    case "table": {
      const rows = await loadChildren(block, ctx);
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
      const children = await loadChildren(block, ctx, sourceId ?? undefined);
      return (
        <NotionBlocks
          blocks={children}
          insertAdAfter={null}
          skipImageBlockIds={ctx.skipImageBlockIds}
          childMap={ctx.childMap}
          imagePriority={ctx.imagePriority}
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
            <ChildBlocks block={block} ctx={ctx} />
          </>
        );
      }
      return <ChildBlocks block={block} ctx={ctx} />;
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
  /** Preloaded children by block id — avoids a Notion request per block. */
  childMap?: NotionChildMap;
  imagePriority?: ImagePriority;
};

export async function NotionBlocks({
  blocks,
  insertAdAfter = 3,
  skipImageBlockIds = [],
  nested = false,
  childMap,
  imagePriority,
}: Props) {
  const ctx: RenderCtx = {
    childMap,
    skipImageBlockIds,
    imagePriority: imagePriority ?? { used: false },
  };
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
              <Block key={"id" in b ? b.id : gi} block={b} ctx={ctx} />
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
              <Block key={"id" in b ? b.id : gi} block={b} ctx={ctx} />
            ))
          )}
        </ol>
      );
      renderedBlocks += group.items.length;
    } else {
      const b = group.items[0];
      out.push(
        <Block key={"id" in b ? b.id : gi} block={b} ctx={ctx} />
      );
      renderedBlocks += 1;
    }

    if (insertAdAfter != null && renderedBlocks === insertAdAfter) {
      out.push(<AdSlot key="in-article-ad" unit="inArticle" />);
    }
  }

  if (nested) return <>{out}</>;
  return <div className="notion-body">{out}</div>;
}
