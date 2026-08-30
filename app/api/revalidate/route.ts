import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Optional cache bust for later Notion webhooks.
 * POST /api/revalidate  with header x-revalidate-secret or ?secret=
 * Does nothing useful until REVALIDATE_SECRET is set in Vercel.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATE_SECRET is not configured" },
      { status: 501 }
    );
  }

  const provided =
    request.headers.get("x-revalidate-secret") ||
    request.nextUrl.searchParams.get("secret") ||
    "";

  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, revalidated: true });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
