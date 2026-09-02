import Link from "next/link";
import { CONTACT_EMAIL, COPYRIGHT_YEAR, SITE_LEGAL_NAME } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-copy">
          © {COPYRIGHT_YEAR} {SITE_LEGAL_NAME}
        </p>
        <nav className="site-footer-nav" aria-label="사이트 정보">
          <Link href="/privacy">개인정보처리방침</Link>
          <span className="site-footer-sep" aria-hidden="true">
            ·
          </span>
          <a href={`mailto:${CONTACT_EMAIL}`}>문의하기</a>
        </nav>
      </div>
    </footer>
  );
}
