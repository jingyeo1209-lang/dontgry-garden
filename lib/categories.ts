export const REVALIDATE_SECONDS = 60;

export type CategoryId = "ttong" | "pink" | "oasis";

export type CategoryMeta = {
  id: CategoryId;
  emoji: string;
  title: string;
  description: string;
  coverClass: string;
};

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  ttong: {
    id: "ttong",
    emoji: "🥕",
    title: "똔그리의 재테크 한 스푼",
    description: "돈을 더하고 불리고 잘 쓰는 실전 재테크 한 스푼.",
    coverClass: "ttong",
  },
  pink: {
    id: "pink",
    emoji: "🐷",
    title: "연그리의 경제 한 스푼",
    description: "경제를 쉽게 한 스푼씩. 연그리의 경제 이야기.",
    coverClass: "pink",
  },
  oasis: {
    id: "oasis",
    emoji: "🏝️",
    title: "투자자의 오아시스",
    description: "시드머니, 운세, 힐링 미니게임과 지혜의 샘.",
    coverClass: "oasis",
  },
};

/** Display titles match the existing garden home cards. */
export const HOME_ZONE_TITLES: Record<CategoryId, string> = {
  ttong: "🥕 똔그리의 재테크 한 스푼",
  pink: "🐷 연그리의 경제 한 스푼",
  oasis: "🏝️ 투자자의 오아시스",
};

export function isCategoryId(value: string): value is CategoryId {
  return value === "ttong" || value === "pink" || value === "oasis";
}

export function normalizePageId(id: string): string {
  const raw = id.replace(/-/g, "").toLowerCase();
  if (raw.length !== 32) return id;
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}
