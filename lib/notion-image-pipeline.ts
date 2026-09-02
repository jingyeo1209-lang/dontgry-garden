import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { normalizePageId } from "@/lib/categories";
import { extractNotionFileUrl } from "@/lib/notion";
import {
  buildUpstreamFetchInit,
  isAllowedImageHost,
  isImageContentType,
  normalizeUpstreamImageUrl,
  resolveMediaSourceUrl,
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

export type NotionImageTrace = {
  received: boolean;
  mode: "url" | "pageId" | "blockId" | "none";
  pageId?: string | null;
  blockId?: string | null;
  contextId?: string | null;
  inputUrl?: string | null;
  inputUrlHost?: string | null;
  galleryWrapped?: boolean;
  resolvedUrl?: string | null;
  resolvedUrlHost?: string | null;
  upstream?: {
    status: number;
    contentType: string;
    host: string;
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

export function formatMediaError(
  stage: NotionImageFailureStage,
  detail?: string
): string {
  return detail ? `${stage}:${detail}` : stage;
}

function hostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
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

function extractPageCoverRaw(page: PageObjectResponse): string | null {
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

function getNotionClient(): Client | null {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return null;
  return new Client({ auth: token });
}

function initTrace(params: NotionImageRequestParams): NotionImageTrace {
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
  trace: NotionImageTrace
): Promise<string | null> {
  const { pageId, blockId, url, contextId } = params;

  if (url) {
    trace.mode = "url";

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
    trace.failureStage = "resolve-no-client";
    trace.failureDetail = "no-token";
    return null;
  }

  if (pageId) {
    trace.mode = "pageId";

    try {
      const page = await client.pages.retrieve({
        page_id: normalizePageId(pageId),
      });
      if (!isFullPage(page)) {
        trace.failureStage = "resolve-notion-error";
        trace.failureDetail = "not-a-full-page";
        return null;
      }

      const raw = extractPageCoverRaw(page);
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
      trace.failureStage = "resolve-notion-error";
      trace.failureDetail = message;
      return null;
    }
  }

  if (blockId) {
    trace.mode = "blockId";

    try {
      const block = await client.blocks.retrieve({
        block_id: normalizePageId(blockId),
      });
      if (!("type" in block)) {
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
      trace.failureStage = "resolve-notion-error";
      trace.failureDetail = message;
      return null;
    }
  }

  trace.failureStage = "missing-params";
  trace.failureDetail = "need-url-or-pageId-or-blockId";
  return null;
}

export async function runNotionImagePipeline(
  params: NotionImageRequestParams
): Promise<{ trace: NotionImageTrace; body?: ReadableStream; contentType?: string }> {
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

  const fetchUrl = normalizeUpstreamImageUrl(sourceUrl);
  let target: URL;
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

function traceToResponse(trace: NotionImageTrace, message: string): Response {
  const errorHeader = formatMediaError(trace.failureStage, trace.failureDetail);
  return new Response(message, {
    status: trace.finalStatus,
    headers: {
      "X-Notion-Media-Error": errorHeader.slice(0, 200),
      "X-Notion-Media-Stage": trace.failureStage,
    },
  });
}

export function buildNotionImageResponse(result: {
  trace: NotionImageTrace;
  body?: ReadableStream;
  contentType?: string;
}): Response {
  const { trace, body, contentType } = result;

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
