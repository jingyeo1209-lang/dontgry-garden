import { NextRequest, NextResponse } from "next/server";
import { isCategoryId } from "@/lib/categories";
import { getPublishedArticles } from "@/lib/notion";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") || "";
  if (category && !isCategoryId(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { articles, config, error } = await getPublishedArticles(
    category && isCategoryId(category) ? category : undefined
  );

  return NextResponse.json(
    { articles, config, error: error || null },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
