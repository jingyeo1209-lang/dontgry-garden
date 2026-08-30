export type AdSlotKey = "banner" | "footer" | "inArticle";

export function getAdsenseClient(): string {
  return (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-8183610093645853").trim();
}

export function getAdSlotId(key: AdSlotKey): string {
  const map: Record<AdSlotKey, string | undefined> = {
    banner: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER,
    footer: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER,
    inArticle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE,
  };
  const value = (map[key] || "").trim();
  if (value) return value;
  if (key === "footer") return (process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER || "").trim();
  return "";
}

export function isAdsConfigured(): boolean {
  return Boolean(getAdsenseClient());
}
