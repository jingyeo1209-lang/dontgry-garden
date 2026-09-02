import { NextRequest } from "next/server";
import {
  buildNotionImageResponse,
  formatMediaError,
  runNotionImagePipeline,
} from "@/lib/notion-image-diag";

export async function GET(request: NextRequest) {
  const pageId = request.nextUrl.searchParams.get("pageId");
  const blockId = request.nextUrl.searchParams.get("blockId");
  const legacyUrl = request.nextUrl.searchParams.get("url");
  const contextId = request.nextUrl.searchParams.get("contextId");
  const format = request.nextUrl.searchParams.get("format");

  const result = await runNotionImagePipeline({
    pageId,
    blockId,
    url: legacyUrl,
    contextId,
  });

  if (format === "json") {
    return Response.json(result.trace, {
      status: result.trace.finalStatus,
      headers: {
        "X-Notion-Media-Stage": result.trace.failureStage,
        ...(result.trace.failureStage !== "success"
          ? {
              "X-Notion-Media-Error": formatMediaError(
                result.trace.failureStage,
                result.trace.failureDetail
              ).slice(0, 200),
            }
          : {}),
      },
    });
  }

  return buildNotionImageResponse(result);
}
