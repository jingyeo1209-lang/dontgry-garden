import { NextRequest } from "next/server";
import {
  resolveBlockMediaSourceUrl,
  resolvePageCoverSourceUrl,
} from "@/lib/notion";

function isAllowedImageHost(hostname: string): boolean {
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

function needsNotionAuth(hostname: string): boolean {
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

async function streamImageFromUrl(raw: string): Promise<Response> {
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (target.protocol !== "https:" || !isAllowedImageHost(target.hostname)) {
    return new Response("Host not allowed", { status: 400 });
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
    return new Response("Image fetch failed", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "";
  const allowed =
    contentType.startsWith("image/") || contentType === "application/pdf";
  if (!allowed) {
    return new Response("Image fetch failed", { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}

export async function GET(request: NextRequest) {
  const pageId = request.nextUrl.searchParams.get("pageId");
  const blockId = request.nextUrl.searchParams.get("blockId");
  const legacyUrl = request.nextUrl.searchParams.get("url");

  let sourceUrl: string | null = null;

  if (pageId) {
    sourceUrl = await resolvePageCoverSourceUrl(pageId);
  } else if (blockId) {
    sourceUrl = await resolveBlockMediaSourceUrl(blockId);
  } else if (legacyUrl) {
    sourceUrl = legacyUrl;
  } else {
    return new Response("Missing pageId, blockId, or url", { status: 400 });
  }

  if (!sourceUrl) {
    return new Response("Image not found", { status: 404 });
  }

  try {
    return await streamImageFromUrl(sourceUrl);
  } catch {
    return new Response("Image fetch failed", { status: 502 });
  }
}
