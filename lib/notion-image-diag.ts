import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { normalizePageId } from "@/lib/categories";
import {
  extractBlockImageUrl,
  extractNotionFileUrl,
  getBlockChildren,
  getNotionConfigStatus,
  getPublishedArticles,
  type GardenArticle,
} from "@/lib/notion";
import {
  buildUpstreamFetchInit,
  isAllowedImageHost,
  isImageContentType,
  isPresignedS3Url,
  normalizeUpstreamImageUrl,
  resolveMediaSourceUrl,
  toProxiedBlockMediaUrl,
  toProxiedImageUrl,
  toProxiedPageCoverUrl,
  wrapNotionGalleryCover,
} from "@/lib/notion-media";

export type NotionImageFailureStage =
  | "missing-params"
  | "resolve-no-client"
  | "resolve-notion-error"
  | "resolve-no-url"
  | "resolve-invalid-url"
  | "upstream-protocol-denied"
  | "upstream-host-denied"
  | "upstream-fetch-failed"
  | "upstream-bad-content-type"
  | "upstream-fetch-error"
  | "success";

export type NotionRetrieveDiag = {
  attempted: boolean;
  ok: boolean;
  error?: string;
  entityType?: "page" | "block";
  coverType?: string;
  blockType?: string;
  rawMediaHost?: string;
};

export type NotionImageDiagTrace = {
  received: boolean;
  mode: "url" | "pageId" | "blockId" | "none";
  pageId?: string | null;
  blockId?: string | null;
  contextId?: string | null;
  inputUrl?: string | null;
  inputUrlHost?: string | null;
  notionRetrieve?: NotionRetrieveDiag;
  galleryWrapped?: boolean;
  resolvedUrl?: string | null;
  resolvedUrlHost?: string | null;
  proxyPath?: string | null;
  upstream?: {
    status: number;
    contentType: string;
    host: string;
    presignedS3?: boolean;
    authHeaderSent?: boolean;
  };
  finalStatus: number;
  failureStage: NotionImageFailureStage;
  failureDetail?: string;
};

export type NotionImageRequestParams = {
  pageId?: string | null;
  blockId?: string | null;
  url?: string | null;
  contextId?: string | null;
};

export type ArticleImageDiag = {
  article: Pick<GardenArticle, "id" | "title" | "category" | "coverImage">;
  cover: {
    rawUrl: string | null;
    rawUrlHost: string | null;
    proxyUrlMode: NotionImageDiagTrace;
    proxyPageIdMode: NotionImageDiagTrace;
  };
  imageBlocks: Array<{
    blockId: string;
    rawUrl: string | null;
    rawUrlHost: string | null;
    proxyUrlMode: NotionImageDiagTrace;
    proxyBlockIdMode: NotionImageDiagTrace;
  }>;
};

export type NotionImageDiagReport = {
  generatedAt: string;
  config: ReturnType<typeof getNotionConfigStatus>;
  samples: ArticleImageDiag[];
  error?: string;
};

export function formatMediaError(
  stage: NotionImageFailureStage,
  detail?: string
): string {
  return detail ? `${stage}:${detail}` : stage;
}

export function hostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function logNotionImageDiag(trace: NotionImageDiagTrace): void {
  console.log("[notion-image-diag]", JSON.stringify(trace));
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

function extractPageCoverRaw(page: PageObjectResponse): {
  url: string | null;
  coverType: string | null;
} {
  if (page.cover?.type === "external") {
    return { url: page.cover.external.url, coverType: "page.cover.external" };
  }
  if (page.cover?.type === "file") {
    return { url: page.cover.file.url, coverType: "page.cover.file" };
  }

  for (const value of Object.values(page.properties)) {
    if (value.type === "files" && value.files.length) {
      const first = value.files[0];
      if (first.type === "file") {
        return { url: first.file.url, coverType: "property.files.file" };
      }
      if (first.type === "external") {
        return { url: first.external.url, coverType: "property.files.external" };
      }
    }
  }

  return { url: null, coverType: null };
}

function getNotionClient(): Client | null {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return null;
  return new Client({ auth: token });
}

function initTrace(params: NotionImageRequestParams): NotionImageDiagTrace {
  return {
    received: true,
    mode: "none",
    pageId: params.pageId ?? null,
    blockId: params.blockId ?? null,
    contextId: params.contextId ?? null,
    inputUrl: params.url ?? null,
    inputUrlHost: hostFromUrl(params.url),
    finalStatus: 200,
    failureStage: "success",
  };
}

async function resolveSourceUrl(
  params: NotionImageRequestParams,
  trace: NotionImageDiagTrace
): Promise<string | null> {
  const { pageId, blockId, url, contextId } = params;

  if (url) {
    trace.mode = "url";
    trace.proxyPath = toProxiedImageUrl(url, contextId ?? undefined);

    let source = url;
    if (contextId) {
      const wrapped = wrapNotionGalleryCover(url, contextId);
      if (wrapped) {
        trace.galleryWrapped = true;
        source = wrapped;
      } else {
        source = resolveMediaSourceUrl(url, contextId);
      }
    }

    trace.resolvedUrl = source;
    trace.resolvedUrlHost = hostFromUrl(source);
    return source;
  }

  const client = getNotionClient();
  if (!client) {
    trace.notionRetrieve = {
      attempted: false,
      ok: false,
      error: "NOTION_TOKEN missing",
    };
    trace.failureStage = "resolve-no-client";
    trace.failureDetail = "no-token";
    return null;
  }

  if (pageId) {
    trace.mode = "pageId";
    trace.proxyPath = toProxiedPageCoverUrl(pageId);

    try {
      const page = await client.pages.retrieve({
        page_id: normalizePageId(pageId),
      });
      if (!isFullPage(page)) {
        trace.notionRetrieve = {
          attempted: true,
          ok: false,
          error: "not-a-full-page",
          entityType: "page",
        };
        trace.failureStage = "resolve-notion-error";
        trace.failureDetail = "not-a-full-page";
        return null;
      }

      const { url: raw, coverType } = extractPageCoverRaw(page);
      trace.notionRetrieve = {
        attempted: true,
        ok: true,
        entityType: "page",
        coverType: coverType ?? undefined,
        rawMediaHost: hostFromUrl(raw) ?? undefined,
      };

      if (!raw) {
        trace.failureStage = "resolve-no-url";
        trace.failureDetail = "no-cover-on-page";
        return null;
      }

      const wrapped = wrapNotionGalleryCover(raw, pageId);
      const source = wrapped ?? raw;
      trace.galleryWrapped = Boolean(wrapped);
      trace.resolvedUrl = source;
      trace.resolvedUrlHost = hostFromUrl(source);
      return source;
    } catch (err) {
      const message = err instanceof Error ? err.message : "notion-pages-retrieve-failed";
      trace.notionRetrieve = {
        attempted: true,
        ok: false,
        error: message,
        entityType: "page",
      };
      trace.failureStage = "resolve-notion-error";
      trace.failureDetail = message;
      return null;
    }
  }

  if (blockId) {
    trace.mode = "blockId";
    trace.proxyPath = toProxiedBlockMediaUrl(blockId);

    try {
      const block = await client.blocks.retrieve({
        block_id: normalizePageId(blockId),
      });
      if (!("type" in block)) {
        trace.notionRetrieve = {
          attempted: true,
          ok: false,
          error: "block-missing-type",
          entityType: "block",
        };
        trace.failureStage = "resolve-notion-error";
        trace.failureDetail = "block-missing-type";
        return null;
      }

      let raw: string | null = null;
      if (block.type === "image") {
        raw = extractNotionFileUrl(block.image);
      } else if (block.type === "file") {
        raw = extractNotionFileUrl(block.file);
      } else if (block.type === "pdf") {
        raw = extractNotionFileUrl(block.pdf);
      }

      trace.notionRetrieve = {
        attempted: true,
        ok: true,
        entityType: "block",
        blockType: block.type,
        rawMediaHost: hostFromUrl(raw) ?? undefined,
      };

      if (!raw) {
        trace.failureStage = "resolve-no-url";
        trace.failureDetail = `block-type-${block.type}-no-url`;
        return null;
      }

      const wrapped = wrapNotionGalleryCover(raw, blockId);
      const source = wrapped ?? raw;
      trace.galleryWrapped = Boolean(wrapped);
      trace.resolvedUrl = source;
      trace.resolvedUrlHost = hostFromUrl(source);
      return source;
    } catch (err) {
      const message = err instanceof Error ? err.message : "notion-blocks-retrieve-failed";
      trace.notionRetrieve = {
        attempted: true,
        ok: false,
        error: message,
        entityType: "block",
      };
      trace.failureStage = "resolve-notion-error";
      trace.failureDetail = message;
      return null;
    }
  }

  trace.failureStage = "missing-params";
  trace.failureDetail = "need-url-or-pageId-or-blockId";
  return null;
}

export async function probeUpstream(url: string): Promise<{
  ok: boolean;
  status: number;
  contentType: string;
  host: string;
  error?: string;
}> {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return {
      ok: false,
      status: 0,
      contentType: "",
      host: "",
      error: "malformed-url",
    };
  }

  const { fetchUrl, headers, redirect, cache } = buildUpstreamFetchInit(url);

  try {
    const upstream = await fetch(fetchUrl, {
      headers,
      redirect,
      cache,
    });
    const contentType = upstream.headers.get("content-type") || "";
    return {
      ok: upstream.ok,
      status: upstream.status,
      contentType,
      host: hostname,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      contentType: "",
      host: hostname,
      error: err instanceof Error ? err.message : "fetch-error",
    };
  }
}

export async function runNotionImagePipeline(
  params: NotionImageRequestParams
): Promise<{ trace: NotionImageDiagTrace; body?: ReadableStream; contentType?: string }> {
  const trace = initTrace(params);

  if (!params.url && !params.pageId && !params.blockId) {
    trace.failureStage = "missing-params";
    trace.failureDetail = "need-url-or-pageId-or-blockId";
    trace.finalStatus = 400;
    return { trace };
  }

  const sourceUrl = await resolveSourceUrl(params, trace);
  if (!sourceUrl) {
    trace.finalStatus =
      trace.failureStage === "resolve-no-client"
        ? 502
        : trace.failureStage === "resolve-notion-error"
          ? 502
          : 404;
    return { trace };
  }

  let target: URL;
  const fetchUrl = normalizeUpstreamImageUrl(sourceUrl);
  try {
    target = new URL(fetchUrl);
  } catch {
    trace.failureStage = "resolve-invalid-url";
    trace.failureDetail = "malformed-resolved-url";
    trace.finalStatus = 400;
    return { trace };
  }

  if (target.protocol !== "https:") {
    trace.failureStage = "upstream-protocol-denied";
    trace.failureDetail = `${target.protocol}//${target.hostname}`;
    trace.finalStatus = 400;
    return { trace };
  }

  if (!isAllowedImageHost(target.hostname)) {
    trace.failureStage = "upstream-host-denied";
    trace.failureDetail = target.hostname;
    trace.finalStatus = 400;
    return { trace };
  }

  const { fetchUrl: upstreamUrl, headers, redirect, cache } =
    buildUpstreamFetchInit(fetchUrl);
  const authHeaderSent = Boolean(
    headers && typeof headers === "object" && "Authorization" in headers
  );

  try {
    const upstream = await fetch(upstreamUrl, {
      headers,
      redirect,
      cache,
    });

    const contentType = upstream.headers.get("content-type") || "";
    trace.upstream = {
      status: upstream.status,
      contentType,
      host: target.hostname,
      presignedS3: isPresignedS3Url(fetchUrl),
      authHeaderSent,
    };

    if (!upstream.ok || !upstream.body) {
      trace.failureStage = "upstream-fetch-failed";
      trace.failureDetail = `status-${upstream.status}-host-${target.hostname}`;
      trace.finalStatus = 502;
      return { trace };
    }

    if (!isImageContentType(contentType, fetchUrl)) {
      trace.failureStage = "upstream-bad-content-type";
      trace.failureDetail = contentType || "empty";
      trace.finalStatus = 502;
      return { trace };
    }

    const resolvedType = contentType.startsWith("image/")
      ? contentType.split(";")[0].trim()
      : "image/jpeg";

    trace.failureStage = "success";
    trace.finalStatus = 200;
    return { trace, body: upstream.body, contentType: resolvedType };
  } catch (err) {
    trace.failureStage = "upstream-fetch-error";
    trace.failureDetail = err instanceof Error ? err.message : "fetch-error";
    trace.finalStatus = 502;
    return { trace };
  }
}

function traceToResponse(trace: NotionImageDiagTrace, message: string): Response {
  const errorHeader = formatMediaError(trace.failureStage, trace.failureDetail);
  logNotionImageDiag(trace);
  return new Response(message, {
    status: trace.finalStatus,
    headers: {
      "X-Notion-Media-Error": errorHeader.slice(0, 200),
      "X-Notion-Media-Stage": trace.failureStage,
    },
  });
}

export function buildNotionImageResponse(result: {
  trace: NotionImageDiagTrace;
  body?: ReadableStream;
  contentType?: string;
}): Response {
  const { trace, body, contentType } = result;
  logNotionImageDiag(trace);

  if (trace.finalStatus !== 200 || !body) {
    const message =
      trace.failureStage === "missing-params"
        ? "Missing pageId, blockId, or url"
        : trace.failureStage === "resolve-no-url"
          ? "Image not found"
          : trace.failureStage === "upstream-protocol-denied"
            ? "Protocol not allowed"
          : trace.failureStage === "upstream-host-denied"
            ? "Host not allowed"
            : trace.failureStage === "resolve-invalid-url"
              ? "Invalid url"
              : "Image fetch failed";
    return traceToResponse(trace, message);
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType || "image/jpeg",
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "X-Notion-Media-Stage": "success",
    },
  });
}

export async function diagnoseRequest(
  params: NotionImageRequestParams
): Promise<NotionImageDiagTrace> {
  const { trace } = await runNotionImagePipeline(params);
  return trace;
}

async function diagnoseArticle(article: GardenArticle): Promise<ArticleImageDiag> {
  const blocks = await getBlockChildren(article.id);
  const imageBlocks = blocks.filter(
    (block) => "type" in block && block.type === "image" && "id" in block
  );

  const rawCover = await getRawCoverFromPage(article.id);
  const firstImage = imageBlocks[0];
  const firstImageRaw =
    firstImage && "id" in firstImage ? extractBlockImageUrl(firstImage) : null;
  const firstImageBlockId =
    firstImage && "id" in firstImage ? firstImage.id : null;
  const effectiveRawCover = rawCover ?? firstImageRaw;

  return {
    article: {
      id: article.id,
      title: article.title,
      category: article.category,
      coverImage: article.coverImage,
    },
    cover: {
      rawUrl: effectiveRawCover,
      rawUrlHost: hostFromUrl(effectiveRawCover),
      proxyUrlMode: effectiveRawCover
        ? await diagnoseRequest({
            url: effectiveRawCover,
            contextId: rawCover ? article.id : firstImageBlockId ?? article.id,
          })
        : await diagnoseRequest({ pageId: article.id }),
      proxyPageIdMode: await diagnoseRequest({ pageId: article.id }),
    },
    imageBlocks: await Promise.all(
      imageBlocks.slice(0, 5).map(async (block) => {
        const blockId = "id" in block ? block.id : "";
        const raw = extractBlockImageUrl(block);
        return {
          blockId,
          rawUrl: raw,
          rawUrlHost: hostFromUrl(raw),
          proxyUrlMode: raw
            ? await diagnoseRequest({ url: raw, contextId: blockId })
            : await diagnoseRequest({ blockId }),
          proxyBlockIdMode: await diagnoseRequest({ blockId }),
        };
      })
    ),
  };
}

async function getRawCoverFromPage(pageId: string): Promise<string | null> {
  const client = getNotionClient();
  if (!client) return null;
  try {
    const page = await client.pages.retrieve({ page_id: normalizePageId(pageId) });
    if (!isFullPage(page)) return null;
    return extractPageCoverRaw(page).url;
  } catch {
    return null;
  }
}

export async function buildNotionImageDiagReport(options?: {
  titleIncludes?: string | string[];
  maxPerCategory?: number;
}): Promise<NotionImageDiagReport> {
  const config = getNotionConfigStatus();
  const titleFilters = (
    Array.isArray(options?.titleIncludes)
      ? options.titleIncludes
      : options?.titleIncludes
        ? [options.titleIncludes]
        : []
  )
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const maxPerCategory = options?.maxPerCategory ?? 3;

  if (!config.hasToken) {
    return {
      generatedAt: new Date().toISOString(),
      config,
      samples: [],
      error: "NOTION_TOKEN is not set",
    };
  }

  try {
    const picks: GardenArticle[] = [];

    for (const category of ["ttong", "pink"] as const) {
      const { articles } = await getPublishedArticles(category);
      picks.push(...articles.slice(0, maxPerCategory));
    }

    if (titleFilters.length) {
      const { articles } = await getPublishedArticles();
      for (const filter of titleFilters) {
        const match = articles.find((a) => a.title.toLowerCase().includes(filter));
        if (match && !picks.some((p) => p.id === match.id)) {
          picks.unshift(match);
        }
      }
    }

    const unique = Array.from(new Map(picks.map((a) => [a.id, a])).values());
    const samples = await Promise.all(unique.map((article) => diagnoseArticle(article)));

    return {
      generatedAt: new Date().toISOString(),
      config,
      samples,
    };
  } catch (err) {
    return {
      generatedAt: new Date().toISOString(),
      config,
      samples: [],
      error: err instanceof Error ? err.message : "diag-report-failed",
    };
  }
}
