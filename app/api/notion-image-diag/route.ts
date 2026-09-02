import { NextRequest } from "next/server";
import {
  buildNotionImageDiagReport,
  diagnoseRequest,
  type NotionImageRequestParams,
} from "@/lib/notion-image-diag";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const pageId = request.nextUrl.searchParams.get("pageId");
  const blockId = request.nextUrl.searchParams.get("blockId");
  const url = request.nextUrl.searchParams.get("url");
  const contextId = request.nextUrl.searchParams.get("contextId");
  const titleIncludes = request.nextUrl.searchParams.get("titleIncludes");

  if (pageId || blockId || url) {
    const params: NotionImageRequestParams = { pageId, blockId, url, contextId };
    const trace = await diagnoseRequest(params);
    return Response.json({
      generatedAt: new Date().toISOString(),
      params,
      trace,
    });
  }

  const report = await buildNotionImageDiagReport({
    titleIncludes: titleIncludes
      ? titleIncludes.split(",").map((s) => s.trim())
      : ["금 모으기", "부자가 되는"],
    maxPerCategory: 3,
  });

  return Response.json(report);
}
