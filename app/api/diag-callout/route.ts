import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BROKEN_CALLOUT_ID = "3c68faf1-d42b-80b7-b07f-d1fcc4b8657a";
/** Same page — children render correctly (「핵심 요약」). */
const WORKING_CALLOUT_ID = "3c68faf1-d42b-8081-80ee-cf3cfc12243a";

function getClient(): Client | null {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return null;
  return new Client({ auth: token });
}

function richTextPlain(block: unknown): string {
  if (!block || typeof block !== "object" || !("type" in block)) return "";
  const typed = block as { type: string } & Record<string, { rich_text?: { plain_text?: string }[] }>;
  const data = typed[typed.type];
  const rich = data?.rich_text;
  if (!Array.isArray(rich)) return "";
  return rich.map((t) => t.plain_text ?? "").join("");
}

async function inspectCallout(client: Client, blockId: string, label: string) {
  const retrieved = await client.blocks.retrieve({ block_id: blockId });
  const children = await client.blocks.children.list({
    block_id: blockId,
    page_size: 100,
  });

  const hasChildren =
    "has_children" in retrieved ? Boolean(retrieved.has_children) : null;
  const type = "type" in retrieved ? retrieved.type : null;

  let caseLabel: "A" | "B" | "C" | "OK" | "UNKNOWN" = "UNKNOWN";
  if (hasChildren === false) caseLabel = "A";
  else if (hasChildren === true && children.results.length === 0) caseLabel = "B";
  else if (hasChildren === true && children.results.length > 0) caseLabel = "OK";
  else caseLabel = "C";

  return {
    label,
    block_id: blockId,
    case: caseLabel,
    retrieve: {
      type,
      has_children: hasChildren,
      rich_text_plain: richTextPlain(retrieved),
    },
    children: {
      results_length: children.results.length,
      has_more: children.has_more,
      next_cursor: children.next_cursor,
      results: children.results.map((child) => ({
        id: "id" in child ? child.id : null,
        type: "type" in child ? child.type : "PARTIAL_NO_TYPE",
        has_children: "has_children" in child ? Boolean(child.has_children) : null,
        rich_text_plain: richTextPlain(child),
      })),
    },
  };
}

/**
 * Temporary read-only diagnosis for empty callout children (notion-cms Preview).
 * Does not log or return NOTION_TOKEN.
 */
export async function GET() {
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "NOTION_TOKEN missing", broken: null, working: null, comparison: null },
      { status: 503 }
    );
  }

  try {
    const [broken, working] = await Promise.all([
      inspectCallout(client, BROKEN_CALLOUT_ID, "broken_한줄요약"),
      inspectCallout(client, WORKING_CALLOUT_ID, "working_핵심요약"),
    ]);

    return NextResponse.json({
      broken,
      working,
      comparison: {
        broken_case: broken.case,
        working_case: working.case,
        broken_has_children: broken.retrieve.has_children,
        broken_children_length: broken.children.results_length,
        working_has_children: working.retrieve.has_children,
        working_children_length: working.children.results_length,
        note:
          "A=has_children false; B=has_children true but children empty; C=other retrieve anomaly; OK=children present",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Notion API error";
    // Avoid leaking request auth details if the SDK embeds them.
    const safe = message.replace(/secret_[^\s]+/gi, "[redacted]").replace(/ntn_[^\s]+/gi, "[redacted]");
    return NextResponse.json(
      { error: safe, broken: null, working: null, comparison: null },
      { status: 502 }
    );
  }
}
