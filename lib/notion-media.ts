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

const HTTP_TO_HTTPS_HOSTS = new Set(["postfiles.pstatic.net"]);

/** Notion often embeds Naver images as http://; upgrade only known-safe hosts. */
export function normalizeUpstreamImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol === "http:" && HTTP_TO_HTTPS_HOSTS.has(host)) {
      parsed.protocol = "https:";
      return parsed.href;
    }
  } catch {
    // keep original string for downstream error handling
  }
  return url;
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
    host.endsWith(".lazyrockets.com") ||
    host === "postfiles.pstatic.net"
  );
}

export function isPresignedS3Url(url: string): boolean {
  if (!/\.amazonaws\.com/i.test(url)) return false;
  return /[?&]X-Amz-(Signature|Algorithm|Credential)=/i.test(url);
}

/** Presigned S3 URLs must be fetched verbatim — no Bearer token or extra headers. */
export function buildUpstreamFetchInit(url: string): RequestInit & { fetchUrl: string } {
  if (isPresignedS3Url(url)) {
    return {
      fetchUrl: url,
      headers: {},
      redirect: "follow",
      cache: "no-store",
    };
  }

  const headers: Record<string, string> = { Accept: "image/*,*/*" };
  const token = process.env.NOTION_TOKEN?.trim();
  if (token) {
    try {
      const host = new URL(url).hostname;
      if (needsNotionAuth(host)) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore malformed url; caller validates earlier
    }
  }

  return {
    fetchUrl: url,
    headers,
    redirect: "follow",
    cache: "no-store",
  };
}

export function needsNotionAuth(hostname: string): boolean {
  const host = hostname.toLowerCase();
  // S3 presigned URLs authenticate via query string; Bearer token causes HTTP 400.
  if (host.endsWith(".amazonaws.com")) return false;
  return (
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
