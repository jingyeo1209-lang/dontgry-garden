import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDatabaseResponse,
  ListBlockChildrenResponse,
} from "@notionhq/client/build/src/api-endpoints";
import {
  type CategoryId,
  isCategoryId,
  normalizePageId,
  REVALIDATE_SECONDS,
} from "@/lib/categories";

export { REVALIDATE_SECONDS };

const TITLE_PROP = "제목";
const CATEGORY_PROP = "카테고리";
const PUBLISHED_PROP = "발행";
const THUMBNAIL_PROP = "썸네일";
const SUMMARY_PROP = "요약";
const DATE_PROP = "작성일";

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
  hasDatabaseId: boolean;
  ready: boolean;
};

export function getNotionConfigStatus(): NotionConfigStatus {
  const hasToken = Boolean(process.env.NOTION_TOKEN?.trim());
  const hasDatabaseId = Boolean(process.env.NOTION_DATABASE_ID?.trim());
  return { hasToken, hasDatabaseId, ready: hasToken && hasDatabaseId };
}

function getClient(): Client | null {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return null;
  return new Client({ auth: token });
}

function getDatabaseId(): string | null {
  const id = process.env.NOTION_DATABASE_ID?.trim();
  if (!id) return null;
  const compact = id.replace(/-/g, "");
  if (/^[a-f0-9]{32}$/i.test(compact)) return normalizePageId(compact);
  return id;
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

function richTextToPlain(
  rich: { plain_text: string }[] | undefined
): string {
  if (!rich?.length) return "";
  return rich.map((t) => t.plain_text).join("");
}

function getTitle(page: PageObjectResponse): string {
  const prop = page.properties[TITLE_PROP];
  if (prop?.type === "title") return richTextToPlain(prop.title) || "제목 없음";
  for (const value of Object.values(page.properties)) {
    if (value.type === "title") return richTextToPlain(value.title) || "제목 없음";
  }
  return "제목 없음";
}

function getCategory(page: PageObjectResponse): CategoryId | null {
  const prop = page.properties[CATEGORY_PROP];
  if (prop?.type === "select" && prop.select?.name) {
    const name = prop.select.name.trim();
    if (isCategoryId(name)) return name;
  }
  return null;
}

function getPublished(page: PageObjectResponse): boolean {
  const prop = page.properties[PUBLISHED_PROP];
  if (prop?.type === "checkbox") return prop.checkbox;
  return false;
}

function getSummary(page: PageObjectResponse): string {
  const prop = page.properties[SUMMARY_PROP];
  if (prop?.type === "rich_text") return richTextToPlain(prop.rich_text);
  return "";
}

function getDate(page: PageObjectResponse): string | null {
  const prop = page.properties[DATE_PROP];
  if (prop?.type === "date" && prop.date?.start) return prop.date.start;
  return page.created_time?.slice(0, 10) ?? null;
}

function getFileUrl(
  files: Array<{ type?: string; file?: { url: string }; external?: { url: string } }>
): string | null {
  const first = files[0];
  if (!first) return null;
  if (first.type === "file" && first.file?.url) return first.file.url;
  if (first.type === "external" && first.external?.url) return first.external.url;
  return null;
}

function getCoverImage(page: PageObjectResponse): string | null {
  const thumb = page.properties[THUMBNAIL_PROP];
  if (thumb?.type === "files") {
    const fromProp = getFileUrl(thumb.files);
    if (fromProp) return fromProp;
  }
  if (page.cover?.type === "external") return page.cover.external.url;
  if (page.cover?.type === "file") return page.cover.file.url;
  return null;
}

export function toProxiedImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith("/api/notion-image")) return raw;
  return `/api/notion-image?url=${encodeURIComponent(raw)}`;
}

function pageToArticle(page: PageObjectResponse): GardenArticle | null {
  if (!getPublished(page)) return null;
  const category = getCategory(page);
  if (!category) return null;
  const id = normalizePageId(page.id);
  return {
    id,
    title: getTitle(page),
    category,
    summary: getSummary(page),
    coverImage: toProxiedImageUrl(getCoverImage(page)),
    date: getDate(page),
    url: `/${id}`,
  };
}

async function queryAllPages(client: Client, databaseId: string): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const query: Parameters<Client["databases"]["query"]>[0] = {
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      filter: {
        property: PUBLISHED_PROP,
        checkbox: { equals: true },
      },
    };
    try {
      const response: QueryDatabaseResponse = await client.databases.query({
        ...query,
        sorts: [{ property: DATE_PROP, direction: "descending" }],
      });
      for (const result of response.results) {
        if (isFullPage(result)) pages.push(result);
      }
      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
      continue;
    } catch {
      // 작성일 속성이 없거나 비어 정렬이 실패하면 정렬 없이 재시도
    }
    const response: QueryDatabaseResponse = await client.databases.query(query);

    for (const result of response.results) {
      if (isFullPage(result)) pages.push(result);
    }
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return pages;
}

export async function getPublishedArticles(
  category?: CategoryId
): Promise<{ articles: GardenArticle[]; config: NotionConfigStatus; error?: string }> {
  const config = getNotionConfigStatus();
  if (!config.ready) {
    return { articles: [], config };
  }

  const client = getClient();
  const databaseId = getDatabaseId();
  if (!client || !databaseId) {
    return { articles: [], config };
  }

  try {
    const pages = await queryAllPages(client, databaseId);
    let articles = pages
      .map(pageToArticle)
      .filter((a): a is GardenArticle => Boolean(a));

    if (category) {
      articles = articles.filter((a) => a.category === category);
    }

    return { articles, config };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Notion API 오류";
    return { articles: [], config, error: message };
  }
}

export async function getArticleById(
  pageId: string
): Promise<{ article: GardenArticle | null; page: PageObjectResponse | null; config: NotionConfigStatus; error?: string }> {
  const config = getNotionConfigStatus();
  if (!config.ready) {
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
    const article = pageToArticle(page);
    return { article, page, config };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Notion API 오류";
    return { article: null, page: null, config, error: message };
  }
}

export type NotionBlock = ListBlockChildrenResponse["results"][number];

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
