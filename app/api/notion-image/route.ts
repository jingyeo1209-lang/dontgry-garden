import { NextRequest } from "next/server";
import {
  buildNotionImageResponse,
  runNotionImagePipeline,
} from "@/lib/notion-image-pipeline";

export async function GET(request: NextRequest) {
  const pageId = request.nextUrl.searchParams.get("pageId");
  const blockId = request.nextUrl.searchParams.get("blockId");
  const legacyUrl = request.nextUrl.searchParams.get("url");
  const contextId = request.nextUrl.searchParams.get("contextId");

  const result = await runNotionImagePipeline({
    pageId,
    blockId,
    url: legacyUrl,
    contextId,
  });

  return buildNotionImageResponse(result);
}
