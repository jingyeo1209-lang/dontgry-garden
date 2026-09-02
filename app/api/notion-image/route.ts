import { NextRequest } from "next/server";
import {
  resolveBlockMediaSourceUrl,
  resolvePageCoverSourceUrl,
} from "@/lib/notion";
import {
  guessImageContentType,
  isAllowedImageHost,
  isImageContentType,
  needsNotionAuth,
  resolveMediaSourceUrl,
  wrapNotionGalleryCover,
} from "@/lib/notion-media";

function errorResponse(
  status: number,
  message: string,
  detail?: string
): Response {
  if (detail) {
    console.error("[notion-image]", message, detail);
  }
  return new Response(message, {
    status,
    headers: detail ? { "X-Notion-Media-Error": detail.slice(0, 200) } : undefined,
  });
}

async function streamImageFromUrl(raw: string): Promise<Response> {
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return errorResponse(400, "Invalid url", "malformed-url");
  }

  if (target.protocol !== "https:" || !isAllowedImageHost(target.hostname)) {
    return errorResponse(400, "Host not allowed", target.hostname);
  }

  const headers: Record<string, string> = { Accept: "image/*,*/*" };
  const token = process.env.NOTION_TOKEN?.trim();
  if (token && needsNotionAuth(target.hostname)) {
    headers.Authorization = `Bearer ${token}`;
  }

  const upstream = await fetch(target.toString(), {
    headers,
    redirect: "follow",
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    return errorResponse(
      502,
      "Image fetch failed",
      `upstream-${upstream.status}-${target.hostname}`
    );
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (!isImageContentType(contentType, target.toString())) {
    return errorResponse(
      502,
      "Image fetch failed",
      `content-type-${contentType || "empty"}`
    );
  }

  const resolvedType = contentType.startsWith("image/")
    ? contentType.split(";")[0].trim()
    : guessImageContentType(target.toString());

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": resolvedType,
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}

export async function GET(request: NextRequest) {
  const pageId = request.nextUrl.searchParams.get("pageId");
  const blockId = request.nextUrl.searchParams.get("blockId");
  const legacyUrl = request.nextUrl.searchParams.get("url");
  const contextId = request.nextUrl.searchParams.get("contextId");

  let sourceUrl: string | null = null;
  let resolveMode = "unknown";

  try {
    if (legacyUrl) {
      resolveMode = "url";
      sourceUrl = legacyUrl;
      if (contextId) {
        sourceUrl =
          wrapNotionGalleryCover(legacyUrl, contextId) ??
          resolveMediaSourceUrl(legacyUrl, contextId);
      }
    } else if (pageId) {
      resolveMode = "pageId";
      sourceUrl = await resolvePageCoverSourceUrl(pageId);
    } else if (blockId) {
      resolveMode = "blockId";
      sourceUrl = await resolveBlockMediaSourceUrl(blockId);
    } else {
      return errorResponse(400, "Missing pageId, blockId, or url");
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : "resolve-error";
    return errorResponse(502, "Image resolve failed", `${resolveMode}:${detail}`);
  }

  if (!sourceUrl) {
    return errorResponse(
      404,
      "Image not found",
      `${resolveMode}:${pageId || blockId || "url"}`
    );
  }

  try {
    return await streamImageFromUrl(sourceUrl);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "fetch-error";
    return errorResponse(502, "Image fetch failed", detail);
  }
}
