import Link from "next/link";
import {
  buildNotionImageDiagReport,
  formatMediaError,
  type NotionImageDiagTrace,
} from "@/lib/notion-image-diag";

export const dynamic = "force-dynamic";

function stageBadge(trace: NotionImageDiagTrace) {
  const label = formatMediaError(trace.failureStage, trace.failureDetail);
  const ok = trace.failureStage === "success" && trace.finalStatus === 200;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 12,
        background: ok ? "#e6ffed" : "#fff5f5",
        color: ok ? "#22543d" : "#9b2c2c",
        border: `1px solid ${ok ? "#9ae6b4" : "#feb2b2"}`,
      }}
    >
      {trace.finalStatus} · {label}
    </span>
  );
}

function TraceTable({ title, trace }: { title: string; trace: NotionImageDiagTrace }) {
  return (
    <details style={{ marginBottom: 12 }}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>
        {title} {stageBadge(trace)}
      </summary>
      <table
        style={{
          width: "100%",
          marginTop: 8,
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <tbody>
          <tr>
            <th align="left">mode</th>
            <td>{trace.mode}</td>
          </tr>
          <tr>
            <th align="left">pageId</th>
            <td>{trace.pageId || "—"}</td>
          </tr>
          <tr>
            <th align="left">blockId</th>
            <td>{trace.blockId || "—"}</td>
          </tr>
          <tr>
            <th align="left">contextId</th>
            <td>{trace.contextId || "—"}</td>
          </tr>
          <tr>
            <th align="left">inputUrl host</th>
            <td>{trace.inputUrlHost || "—"}</td>
          </tr>
          <tr>
            <th align="left">notion retrieve</th>
            <td>
              {trace.notionRetrieve
                ? JSON.stringify(trace.notionRetrieve)
                : "—"}
            </td>
          </tr>
          <tr>
            <th align="left">gallery wrapped</th>
            <td>{trace.galleryWrapped ? "yes" : "no"}</td>
          </tr>
          <tr>
            <th align="left">resolved host</th>
            <td>{trace.resolvedUrlHost || "—"}</td>
          </tr>
          <tr>
            <th align="left">upstream</th>
            <td>{trace.upstream ? JSON.stringify(trace.upstream) : "—"}</td>
          </tr>
          <tr>
            <th align="left">proxy path</th>
            <td>
              {trace.proxyPath ? (
                <a href={trace.proxyPath} target="_blank" rel="noreferrer">
                  {trace.proxyPath}
                </a>
              ) : (
                "—"
              )}
            </td>
          </tr>
          <tr>
            <th align="left">JSON probe</th>
            <td>
              {trace.proxyPath ? (
                <a
                  href={`${trace.proxyPath}${trace.proxyPath.includes("?") ? "&" : "?"}format=json`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {trace.proxyPath}&format=json
                </a>
              ) : (
                "—"
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </details>
  );
}

export default async function NotionImageDiagPage() {
  const report = await buildNotionImageDiagReport({
    titleIncludes: ["금 모으기", "부자가 되는"],
    maxPerCategory: 3,
  });

  return (
    <main className="page page-narrow" style={{ maxWidth: 960 }}>
      <Link href="/" className="back-link">
        ← 대문으로 돌아가기
      </Link>
      <h1 className="page-title">Notion 이미지 진단</h1>
      <p style={{ color: "#787774", fontSize: 14 }}>
        Preview에서 이미지 프록시가 어느 단계에서 실패하는지 확인합니다. 서버 로그에도{" "}
        <code>[notion-image-diag]</code> JSON이 남습니다.
      </p>

      <section style={{ margin: "24px 0", fontSize: 14 }}>
        <h2>환경</h2>
        <ul>
          <li>NOTION_TOKEN: {report.config.hasToken ? "설정됨" : "없음"}</li>
          <li>ttong DB: {report.config.databases.ttong ? "설정됨" : "없음"}</li>
          <li>pink DB: {report.config.databases.pink ? "설정됨" : "없음"}</li>
          <li>생성 시각: {report.generatedAt}</li>
        </ul>
        {report.error ? (
          <p style={{ color: "#9b2c2c" }}>리포트 오류: {report.error}</p>
        ) : null}
      </section>

      <section style={{ margin: "24px 0", fontSize: 14 }}>
        <h2>직접 확인 링크</h2>
        <ul>
          <li>
            <a href="/api/notion-image-diag" target="_blank" rel="noreferrer">
              /api/notion-image-diag
            </a>{" "}
            — 샘플 글 자동 진단 JSON
          </li>
          <li>
            <code>?pageId=...&amp;format=json</code> / <code>?blockId=...</code> /{" "}
            <code>?url=...&amp;contextId=...</code> — 단일 요청 진단
          </li>
        </ul>
      </section>

      {report.samples.map((sample) => (
        <section
          key={sample.article.id}
          style={{
            margin: "32px 0",
            padding: "16px",
            border: "1px solid #e9e9e7",
            borderRadius: 8,
          }}
        >
          <h2>
            [{sample.article.category}] {sample.article.title}
          </h2>
          <p style={{ fontSize: 13, color: "#787774" }}>pageId: {sample.article.id}</p>
          <p style={{ fontSize: 13 }}>
            SSR cover proxy:{" "}
            {sample.article.coverImage ? (
              <a href={sample.article.coverImage} target="_blank" rel="noreferrer">
                {sample.article.coverImage}
              </a>
            ) : (
              "없음"
            )}
          </p>

          <h3>대표 이미지 (cover)</h3>
          <p style={{ fontSize: 13 }}>
            raw host: {sample.cover.rawUrlHost || "—"}
          </p>
          <TraceTable title="1) url + contextId" trace={sample.cover.proxyUrlMode} />
          <TraceTable title="2) pageId" trace={sample.cover.proxyPageIdMode} />

          {sample.imageBlocks.length ? (
            <>
              <h3>본문 image block ({sample.imageBlocks.length}개)</h3>
              {sample.imageBlocks.map((block, index) => (
                <div
                  key={block.blockId}
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: "1px solid #eee",
                  }}
                >
                  <h4>
                    #{index + 1} blockId: {block.blockId}
                  </h4>
                  <p style={{ fontSize: 13 }}>raw host: {block.rawUrlHost || "—"}</p>
                  <TraceTable title="1) url + contextId" trace={block.proxyUrlMode} />
                  <TraceTable title="2) blockId" trace={block.proxyBlockIdMode} />
                </div>
              ))}
            </>
          ) : (
            <p style={{ color: "#787774" }}>본문 image block 없음</p>
          )}
        </section>
      ))}
    </main>
  );
}
