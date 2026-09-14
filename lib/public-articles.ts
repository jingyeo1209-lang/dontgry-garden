import { normalizePageId } from "@/lib/categories";

/**
 * If this list has IDs, only those articles appear on the site.
 * Set to `[]` to show every published Notion article again.
 */
export const PUBLIC_ARTICLE_IDS: string[] = [];

export function isPublicArticleFilterOn() {
  return PUBLIC_ARTICLE_IDS.length > 0;
}

export function isPublicArticleId(pageId: string) {
  if (!PUBLIC_ARTICLE_IDS.length) return true;
  const id = normalizePageId(pageId);
  return PUBLIC_ARTICLE_IDS.some((allowed) => normalizePageId(allowed) === id);
}

export function filterPublicArticles<T extends { id: string }>(articles: T[]) {
  if (!PUBLIC_ARTICLE_IDS.length) return articles;
  return articles.filter((article) => isPublicArticleId(article.id));
}
