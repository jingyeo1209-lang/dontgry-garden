import { NextRequest } from "next/server";

function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "www.notion.so" ||
    host === "notion.so" ||
    host.endsWith(".notion.so") ||
    host.endsWith(".amazonaws.com") ||
    host === "images.unsplash.com" ||
    host.endsWith(".unsplash.com")
  );
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return new Response("Missing url", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (target.protocol !== "https:" || !isAllowedImageHost(target.hostname)) {
    return new Response("Host not allowed", { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Accept: "image/*,*/*" },
      next: { revalidate: 60 },
    });
    if (!upstream.ok || !upstream.body) {
      return new Response("Image fetch failed", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60, s-maxage=3600",
      },
    });
  } catch {
    return new Response("Image fetch failed", { status: 502 });
  }
}
