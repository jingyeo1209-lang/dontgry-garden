import { AdSlot } from "@/components/AdSlot";
import { HOME_ZONE_TITLES } from "@/lib/categories";
import Link from "next/link";

export const revalidate = 60;

export default function HomePage() {
  return (
    <main className="page">
      <h1 className="page-title">
        <span className="emoji">🏡</span>똔그리 가든
      </h1>
      <p className="page-desc">다 같이 돼지런하게, 리치 투게더!</p>

      <div className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/garden-map.png" alt="똔그리 가든 — 돈을 키우는 돼지들의 정원" />
      </div>

      <AdSlot unit="banner" />

      <div className="gallery">
        <Link href="/ttong" className="card">
          <div className="card-cover ttong">🥕</div>
          <div className="card-body">
            <div className="card-title">{HOME_ZONE_TITLES.ttong}</div>
          </div>
        </Link>
        <Link href="/pink" className="card">
          <div className="card-cover pink">🐷</div>
          <div className="card-body">
            <div className="card-title">{HOME_ZONE_TITLES.pink}</div>
          </div>
        </Link>
        <a href="/magic-glasses.html" className="card">
          <div className="card-cover sungree">🕶️</div>
          <div className="card-body">
            <div className="card-title">🕶️ 썬그리의 메타 안경</div>
          </div>
        </a>
        <a href="/oasis.html" className="card">
          <div className="card-cover oasis">🏝️</div>
          <div className="card-body">
            <div className="card-title">{HOME_ZONE_TITLES.oasis}</div>
          </div>
        </a>
      </div>

      <AdSlot unit="footer" />
    </main>
  );
}
