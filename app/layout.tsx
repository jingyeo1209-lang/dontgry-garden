import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { getAdsenseClient } from "@/lib/ads";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.dontgry.com"),
  title: "똔그리 가든",
  description: "다 같이 돼지런하게, 리치 투게더! 재테크·경제·투자 인사이트를 한곳에서.",
  openGraph: {
    title: "똔그리 가든",
    description: "다 같이 돼지런하게, 리치 투게더!",
    type: "website",
    images: ["/garden-map.png"],
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const adsClient = getAdsenseClient();

  return (
    <html lang="ko">
      <body>
        {adsClient ? (
          <Script
            id="adsense"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsClient}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
