import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page page-narrow">
      <Link href="/" className="back-link">
        ← 대문으로 돌아가기
      </Link>
      <h1 className="page-title">페이지를 찾을 수 없습니다</h1>
      <p className="page-desc">주소가 바뀌었거나, 아직 발행되지 않은 글일 수 있습니다.</p>
    </main>
  );
}
