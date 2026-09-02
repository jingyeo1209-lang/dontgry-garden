import { normalizePageId } from "@/lib/categories";

/** Notion gallery preset covers must be fetched via the legacy Oopy wrapper. */
export function wrapNotionGalleryCover(
  externalUrl: string,
  contextId: string
): string | null {
  try {
    const u = new URL(externalUrl);
    if (!u.hostname.toLowerCase().endsWith("notion.so")) return null;
    if (!u.pathname.startsWith("/images/page-cover/")) return null;
    const id = normalizePageId(contextId);
    const params = new URLSearchParams({
      src: u.pathname,
      blockId: id,
      width: "1024",
    });
    return `https://oopy.lazyrockets.com/api/v2/notion/image?${params.toString()}`;
  } catch {
    return null;
  }
}

export function resolveMediaSourceUrl(raw: string, contextId: string): string {
  return wrapNotionGalleryCover(raw, contextId) ?? raw;
}

export function toProxiedImageUrl(
  raw: string | null | undefined,
  contextId?: string
): string | null {
  if (!raw) return null;
  if (raw.startsWith("/api/notion-image")) return raw;
  const params = new URLSearchParams({ url: raw });
  if (contextId) {
    params.set("contextId", normalizePageId(contextId));
  }
  return `/api/notion-image?${params.toString()}`;
}

export function toProxiedMediaUrl(
  raw: string | null | undefined,
  contextId: string
): string | null {
  if (!raw) return null;
  return toProxiedImageUrl(resolveMediaSourceUrl(raw, contextId), contextId);
}

export function toProxiedPageCoverUrl(pageId: string): string {
  return `/api/notion-image?pageId=${encodeURIComponent(normalizePageId(pageId))}`;
}

export function toProxiedBlockMediaUrl(blockId: string): string {
  return `/api/notion-image?blockId=${encodeURIComponent(normalizePageId(blockId))}`;
}

export function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "www.notion.so" ||
    host === "notion.so" ||
    host.endsWith(".notion.so") ||
    host === "www.notion.com" ||
    host === "notion.com" ||
    host.endsWith(".notion.com") ||
    host === "notionusercontent.com" ||
    host.endsWith(".notionusercontent.com") ||
    host === "secure.notion-static.com" ||
    host.endsWith(".amazonaws.com") ||
    host === "images.unsplash.com" ||
    host.endsWith(".unsplash.com") ||
    host.endsWith(".ctfassets.net") ||
    host === "oopy.lazyrockets.com" ||
    host.endsWith(".lazyrockets.com")
  );
}

export function needsNotionAuth(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host.endsWith(".amazonaws.com") ||
    host.endsWith(".notion.so") ||
    host === "notion.so" ||
    host.endsWith(".notion.com") ||
    host === "notion.com" ||
    host === "notionusercontent.com" ||
    host.endsWith(".notionusercontent.com") ||
    host === "secure.notion-static.com"
  );
}

export function isImageContentType(contentType: string, url: string): boolean {
  const ct = contentType.toLowerCase().split(";")[0].trim();
  if (ct.startsWith("image/")) return true;
  if (ct === "application/pdf") return true;
  if (ct === "application/octet-stream" || ct === "binary/octet-stream" || !ct) {
    return /\.(jpe?g|png|gif|webp|avif|svg|bmp|ico)(\?|$)/i.test(url);
  }
  return false;
}

export function guessImageContentType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".gif")) return "image/gif";
  if (lower.includes(".svg")) return "image/svg+xml";
  if (lower.includes(".avif")) return "image/avif";
  return "image/jpeg";
}
