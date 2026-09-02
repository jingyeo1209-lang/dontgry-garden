import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDatabaseResponse,
  ListBlockChildrenResponse,
} from "@notionhq/client/build/src/api-endpoints";
import {
  type CategoryId,
  normalizePageId,
  REVALIDATE_SECONDS,
} from "@/lib/categories";
import {
  toProxiedMediaUrl,
  wrapNotionGalleryCover,
} from "@/lib/notion-media";

export {
  toProxiedBlockMediaUrl,
  toProxiedImageUrl,
  toProxiedMediaUrl,
  toProxiedPageCoverUrl,
} from "@/lib/notion-media";

export { REVALIDATE_SECONDS };

const DB_ENV_KEYS: Record<CategoryId, string> = {
  ttong: "NOTION_DATABASE_ID_TTONG",
  pink: "NOTION_DATABASE_ID_PINK",
  oasis: "NOTION_DATABASE_ID_OASIS",
};

export type GardenArticle = {
  id: string;
  title: string;
  category: CategoryId;
  summary: string;
  coverImage: string | null;
  date: string | null;
  url: string;
};

export type NotionConfigStatus = {
  hasToken: boolean;
  databases: Record<CategoryId, boolean>;
  /** Token + all three database IDs are set. */
  ready: boolean;
  /** Token + the requested category DB (if any) is set. */
  readyFor: (category?: CategoryId) => boolean;
};

function parseDatabaseId(raw: string | undefined): string | null {
  const id = raw?.trim();
  if (!id) return null;
  const compact = id.replace(/-/g, "");
  if (/^[a-f0-9]{32}$/i.test(compact)) return normalizePageId(compact);
  return id;
}

export function getDatabaseIdForCategory(category: CategoryId): string | null {
  return parseDatabaseId(process.env[DB_ENV_KEYS[category]]);
}

export function getNotionConfigStatus(): NotionConfigStatus {
  const hasToken = Boolean(process.env.NOTION_TOKEN?.trim());
  const databases: Record<CategoryId, boolean> = {
    ttong: Boolean(getDatabaseIdForCategory("ttong")),
    pink: Boolean(getDatabaseIdForCategory("pink")),
    oasis: Boolean(getDatabaseIdForCategory("oasis")),
  };
  const ready = hasToken && databases.ttong && databases.pink && databases.oasis;
  return {
    hasToken,
    databases,
    ready,
    readyFor(category) {
      if (!hasToken) return false;
      if (!category) return ready;
      return databases[category];
    },
  };
}

function getClient(): Client | null {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return null;
  return new Client({ auth: token });
}

function isFullPage(page: unknown): page is PageObjectResponse {
  return (
    typeof page === "object" &&
    page !== null &&
    "object" in page &&
    (page as { object?: string }).object === "page" &&
    "properties" in page
  );
}

function richTextToPlain(rich: { plain_text: string }[] | undefined): string {
  if (!rich?.length) return "";
  return rich.map((t) => t.plain_text).join("");
}

function getTitle(page: PageObjectResponse): string {
  for (const value of Object.values(page.properties)) {
    if (value.type === "title") return richTextToPlain(value.title) || "제목 없음";
  }
  return "제목 없음";
}

function getCoverImage(page: PageObjectResponse): string | null {
  // Prefer page cover (matches gallery cards in existing Notion DBs).
  if (page.cover?.type === "external") return page.cover.external.url;
  if (page.cover?.type === "file") return page.cover.file.url;

  for (const value of Object.values(page.properties)) {
    if (value.type === "files" && value.files.length) {
      const first = value.files[0];
      if (first.type === "file") return first.file.url;
      if (first.type === "external") return first.external.url;
    }
  }
  return null;
}

/** Notion file / image object → raw HTTPS URL */
export function extractNotionFileUrl(
  file:
    | {
        type?: string;
        external?: { url?: string };
        file?: { url?: string };
      }
    | null
    | undefined
): string | null {
  if (!file) return null;
  if (file.type === "external") return file.external?.url ?? null;
  if (file.type === "file") return file.file?.url ?? null;
  return file.external?.url ?? file.file?.url ?? null;
}

export async function resolvePageCoverSourceUrl(
  pageId: string
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const page = await client.pages.retrieve({ page_id: normalizePageId(pageId) });
  if (!isFullPage(page)) return null;

  const raw = getCoverImage(page);
  if (!raw) return null;

  return wrapNotionGalleryCover(raw, pageId) ?? raw;
}

export async function resolveBlockMediaSourceUrl(
  blockId: string
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const block = await client.blocks.retrieve({ block_id: normalizePageId(blockId) });
  if (!("type" in block)) return null;

  if (block.type === "image") {
    const raw = extractNotionFileUrl(block.image);
    if (!raw) return null;
    return wrapNotionGalleryCover(raw, blockId) ?? raw;
  }

  if (block.type === "file") {
    return extractNotionFileUrl(block.file);
  }
  if (block.type === "pdf") {
    return extractNotionFileUrl(block.pdf);
  }

  return null;
}

function pageToArticle(page: PageObjectResponse, category: CategoryId): GardenArticle {
  const id = normalizePageId(page.id);
  return {
    id,
    title: getTitle(page),
    category,
    summary: "",
    coverImage: toProxiedMediaUrl(getCoverImage(page), id),
    date: page.last_edited_time?.slice(0, 10) ?? page.created_time?.slice(0, 10) ?? null,
    url: `/${id}`,
  };
}

function categoryFromParentDatabaseId(databaseId: string): CategoryId | null {
  const normalized = normalizePageId(databaseId);
  for (const category of Object.keys(DB_ENV_KEYS) as CategoryId[]) {
    const configured = getDatabaseIdForCategory(category);
    if (configured && normalizePageId(configured) === normalized) return category;
  }
  return null;
}

async function queryAllPages(client: Client, databaseId: string): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response: QueryDatabaseResponse = await client.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    });

    for (const result of response.results) {
      if (isFullPage(result)) pages.push(result);
    }
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return pages;
}

async function loadCategoryArticles(
  client: Client,
  category: CategoryId
): Promise<GardenArticle[]> {
  const databaseId = getDatabaseIdForCategory(category);
  if (!databaseId) return [];
  const pages = await queryAllPages(client, databaseId);
  return pages.map((page) => pageToArticle(page, category));
}

export async function getPublishedArticles(
  category?: CategoryId
): Promise<{ articles: GardenArticle[]; config: NotionConfigStatus; error?: string }> {
  const config = getNotionConfigStatus();
  if (!config.readyFor(category)) {
    return { articles: [], config };
  }

  const client = getClient();
  if (!client) return { articles: [], config };

  try {
    if (category) {
      const articles = await loadCategoryArticles(client, category);
      return { articles, config };
    }

    const categories: CategoryId[] = ["ttong", "pink", "oasis"];
    const nested = await Promise.all(
      categories.map((id) => loadCategoryArticles(client, id))
    );
    const articles = nested.flat();
    articles.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return { articles, config };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Notion API 오류";
    return { articles: [], config, error: message };
  }
}

export async function getArticleById(
  pageId: string
): Promise<{
  article: GardenArticle | null;
  page: PageObjectResponse | null;
  config: NotionConfigStatus;
  error?: string;
}> {
  const config = getNotionConfigStatus();
  if (!config.hasToken) {
    return { article: null, page: null, config };
  }

  const client = getClient();
  if (!client) return { article: null, page: null, config };

  try {
    const id = normalizePageId(pageId);
    const page = await client.pages.retrieve({ page_id: id });
    if (!isFullPage(page)) {
      return { article: null, page: null, config, error: "페이지를 찾을 수 없습니다." };
    }

    if (page.parent.type !== "database_id") {
      return { article: null, page: null, config };
    }

    const category = categoryFromParentDatabaseId(page.parent.database_id);
    if (!category) {
      // Not one of the three CMS databases (e.g. magic-glasses gallery).
      return { article: null, page: null, config };
    }

    if (!getDatabaseIdForCategory(category)) {
      return { article: null, page: null, config };
    }

    return { article: pageToArticle(page, category), page, config };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Notion API 오류";
    return { article: null, page: null, config, error: message };
  }
}

export type NotionBlock = ListBlockChildrenResponse["results"][number];

export function extractBlockImageUrl(block: NotionBlock): string | null {
  if (!("type" in block) || block.type !== "image") return null;
  return extractNotionFileUrl(block.image);
}

export async function getBlockChildren(blockId: string): Promise<NotionBlock[]> {
  const client = getClient();
  if (!client) return [];

  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.blocks.children.list({
      block_id: normalizePageId(blockId),
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}
