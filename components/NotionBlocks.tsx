import type { ReactNode } from "react";
import Link from "next/link";
import type { NotionBlock } from "@/lib/notion";
import {
  extractNotionFileUrl,
  getBlockChildren,
  toProxiedImageUrl,
} from "@/lib/notion";
import { normalizePageId } from "@/lib/categories";
import { AdSlot } from "@/components/AdSlot";

type RichText = {
  plain_text: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
  };
};

function blockHasChildren(block: NotionBlock): boolean {
  return "has_children" in block && Boolean(block.has_children);
}

function renderRichText(items: RichText[] | undefined) {
  if (!items?.length) return null;
  return items.map((t, i) => {
    let node: ReactNode = t.plain_text;
    const a = t.annotations;
    if (a?.code) node = <code key={`c-${i}`}>{node}</code>;
    if (a?.bold) node = <strong key={`b-${i}`}>{node}</strong>;
    if (a?.italic) node = <em key={`i-${i}`}>{node}</em>;
    if (a?.strikethrough) node = <s key={`s-${i}`}>{node}</s>;
    if (a?.underline) node = <u key={`u-${i}`}>{node}</u>;
    if (t.href) {
      node = (
        <a key={`a-${i}`} href={t.href} target="_blank" rel="noopener noreferrer">
          {node}
        </a>
      );
    }
    return <span key={i}>{node}</span>;
  });
}

async function ChildBlocks({
  block,
  skip = false,
}: {
  block: NotionBlock;
  skip?: boolean;
}) {
  if (skip || !blockHasChildren(block) || !("id" in block)) return null;
  const children = await getBlockChildren(block.id);
  if (!children.length) return null;
  return <NotionBlocks blocks={children} insertAdAfter={null} />;
}

async function Block({ block }: { block: NotionBlock }) {
  if (!("type" in block)) return null;
  const type = block.type;
  // @ts-expect-error Notion block union
  const data = block[type];

  switch (type) {
    case "paragraph":
      return (
        <>
          <p className="notion-p">{renderRichText(data?.rich_text)}</p>
          <ChildBlocks block={block} />
        </>
      );
    case "heading_1":
      return <h1 className="notion-h1">{renderRichText(data?.rich_text)}</h1>;
    case "heading_2":
      return <h2 className="notion-h2">{renderRichText(data?.rich_text)}</h2>;
    case "heading_3":
      return <h3 className="notion-h3">{renderRichText(data?.rich_text)}</h3>;
    case "bulleted_list_item":
      return (
        <li className="notion-li">
          {renderRichText(data?.rich_text)}
          <ChildBlocks block={block} />
        </li>
      );
    case "numbered_list_item":
      return (
        <li className="notion-li">
          {renderRichText(data?.rich_text)}
          <ChildBlocks block={block} />
        </li>
      );
    case "to_do":
      return (
        <>
          <label className="notion-todo">
            <input type="checkbox" checked={Boolean(data?.checked)} readOnly />
            <span>{renderRichText(data?.rich_text)}</span>
          </label>
          <ChildBlocks block={block} />
        </>
      );
    case "quote":
      return (
        <>
          <blockquote className="notion-quote">{renderRichText(data?.rich_text)}</blockquote>
          <ChildBlocks block={block} />
        </>
      );
    case "callout":
      return (
        <>
          <div className="notion-callout">
            <span className="notion-callout-icon">{data?.icon?.emoji || "💡"}</span>
            <div>
              {renderRichText(data?.rich_text)}
              <ChildBlocks block={block} />
            </div>
          </div>
        </>
      );
    case "code":
      return (
        <pre className="notion-code">
          <code>{renderRichText(data?.rich_text)}</code>
        </pre>
      );
    case "divider":
      return <hr className="notion-hr" />;
    case "image": {
      const src = toProxiedImageUrl(extractNotionFileUrl(data));
      const caption = renderRichText(data?.caption);
      if (!src) return null;
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
            {renderRichText(data?.caption) || data.url}
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
      const children = blockHasChildren(block) ? await getBlockChildren(block.id) : [];
      return (
        <details className="notion-toggle">
          <summary>{renderRichText(data?.rich_text)}</summary>
          <div className="notion-toggle-body">
            <NotionBlocks blocks={children} insertAdAfter={null} />
          </div>
        </details>
      );
    }
    case "column_list": {
      const columns = blockHasChildren(block) ? await getBlockChildren(block.id) : [];
      return (
        <div className="notion-columns">
          {await Promise.all(columns.map((col) => <Block key={col.id} block={col} />))}
        </div>
      );
    }
    case "column": {
      const children = blockHasChildren(block) ? await getBlockChildren(block.id) : [];
      return (
        <div className="notion-column">
          <NotionBlocks blocks={children} insertAdAfter={null} />
        </div>
      );
    }
    case "table": {
      const rows = blockHasChildren(block) ? await getBlockChildren(block.id) : [];
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
                    {cells.map((cell: RichText[], cellIndex: number) => {
                      const CellTag =
                        hasColumnHeader && rowIndex === 0 ? "th" : "td";
                      return (
                        <CellTag key={cellIndex}>{renderRichText(cell)}</CellTag>
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
      return <NotionBlocks blocks={children} insertAdAfter={null} />;
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
      const raw = extractNotionFileUrl(data);
      const href = raw ? toProxiedImageUrl(raw) : null;
      const name = data?.name || data?.caption?.[0]?.plain_text || "파일 다운로드";
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
            <p className="notion-p">{renderRichText(data.rich_text)}</p>
            <ChildBlocks block={block} />
          </>
        );
      }
      return <ChildBlocks block={block} />;
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
};

export async function NotionBlocks({ blocks, insertAdAfter = 3 }: Props) {
  const groups = groupListItems(blocks);
  const out: ReactNode[] = [];
  let renderedBlocks = 0;

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    if (group.kind === "ul") {
      out.push(
        <ul key={`ul-${gi}`} className="notion-ul">
          {await Promise.all(group.items.map(async (b) => <Block key={b.id} block={b} />))}
        </ul>
      );
      renderedBlocks += group.items.length;
    } else if (group.kind === "ol") {
      out.push(
        <ol key={`ol-${gi}`} className="notion-ol">
          {await Promise.all(group.items.map(async (b) => <Block key={b.id} block={b} />))}
        </ol>
      );
      renderedBlocks += group.items.length;
    } else {
      const b = group.items[0];
      out.push(<Block key={b.id} block={b} />);
      renderedBlocks += 1;
    }

    if (insertAdAfter != null && renderedBlocks === insertAdAfter) {
      out.push(<AdSlot key="in-article-ad" unit="inArticle" />);
    }
  }

  return <div className="notion-body">{out}</div>;
}
