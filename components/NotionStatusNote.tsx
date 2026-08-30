import type { NotionConfigStatus } from "@/lib/notion";
import type { CategoryId } from "@/lib/categories";

type Props = {
  config: NotionConfigStatus;
  error?: string;
  emptyMessage?: string;
  articleCount?: number;
  category?: CategoryId;
};

const DB_LABELS: Record<CategoryId, string> = {
  ttong: "NOTION_DATABASE_ID_TTONG",
  pink: "NOTION_DATABASE_ID_PINK",
  oasis: "NOTION_DATABASE_ID_OASIS",
};

export function NotionStatusNote({
  config,
  error,
  emptyMessage = "아직 발행된 글이 없습니다.",
  articleCount = 0,
  category,
}: Props) {
  if (error) {
    return (
      <div className="status-note status-note-error">
        Notion에서 글을 불러오지 못했습니다. Integration이 해당 데이터베이스에 연결됐는지,
        Preview 환경변수(DB ID)가 맞는지만 확인해 주세요. (글을 이동할 필요는 없습니다.)
        <div className="status-note-detail">{error}</div>
      </div>
    );
  }

  if (!config.readyFor(category)) {
    const missing: string[] = [];
    if (!config.hasToken) missing.push("NOTION_TOKEN");
    if (category) {
      if (!config.databases[category]) missing.push(DB_LABELS[category]);
    } else {
      (Object.keys(DB_LABELS) as CategoryId[]).forEach((id) => {
        if (!config.databases[id]) missing.push(DB_LABELS[id]);
      });
    }
    return (
      <div className="status-note">
        Notion 연결 준비 중입니다. Vercel Environment Variables(Preview)에{" "}
        <strong>{missing.join(", ")}</strong>을(를) 설정한 뒤 Preview를 다시 배포해 주세요.
      </div>
    );
  }

  if (articleCount === 0) {
    return <div className="status-note">{emptyMessage}</div>;
  }

  return null;
}
