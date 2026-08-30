import type { NotionConfigStatus } from "@/lib/notion";

type Props = {
  config: NotionConfigStatus;
  error?: string;
  emptyMessage?: string;
  articleCount?: number;
};

export function NotionStatusNote({
  config,
  error,
  emptyMessage = "아직 발행된 글이 없습니다.",
  articleCount = 0,
}: Props) {
  if (error) {
    return (
      <div className="status-note status-note-error">
        Notion에서 글을 불러오지 못했습니다. 속성 이름(제목/카테고리/발행/썸네일/요약/작성일)과
        Integration 연결을 확인해 주세요.
        <div className="status-note-detail">{error}</div>
      </div>
    );
  }

  if (!config.ready) {
    const missing = [
      !config.hasToken ? "NOTION_TOKEN" : null,
      !config.hasDatabaseId ? "NOTION_DATABASE_ID" : null,
    ].filter(Boolean);
    return (
      <div className="status-note">
        Notion 연결 준비 중입니다. Vercel Environment Variables에{" "}
        <strong>{missing.join(", ")}</strong>을(를) 설정한 뒤 Preview를 다시 배포해 주세요.
      </div>
    );
  }

  if (articleCount === 0) {
    return <div className="status-note">{emptyMessage}</div>;
  }

  return null;
}
