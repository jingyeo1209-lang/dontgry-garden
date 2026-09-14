import type { Metadata } from "next";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { GalleryList } from "@/components/GalleryList";
import { NotionStatusNote } from "@/components/NotionStatusNote";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { getPublishedArticles } from "@/lib/notion";
import { isPublicArticleFilterOn } from "@/lib/public-articles";

type Props = {
  category: CategoryId;
};

export function categoryMetadata(category: CategoryId): Metadata {
  const meta = CATEGORIES[category];
  return {
    title: `${meta.emoji} ${meta.title}`,
    description: meta.description,
    openGraph: {
      title: `${meta.emoji} ${meta.title}`,
      description: meta.description,
      images: ["/garden-map.png"],
    },
  };
}

export async function CategoryPage({ category }: Props) {
  const meta = CATEGORIES[category];
  const { articles, config, error } = await getPublishedArticles(category);

  return (
    <main className="page">
      <Link href="/" className="back-link">
        ← 대문으로 돌아가기
      </Link>
      <h1 className="page-title page-title-category">
        {meta.emoji} {meta.title}
      </h1>

      <AdSlot unit="banner" />

      <NotionStatusNote
        config={config}
        error={error}
        articleCount={articles.length}
        category={category}
        emptyMessage={
          isPublicArticleFilterOn()
            ? "다른 글은 준비 중이에요. 곧 공개할게요."
            : "이 카테고리에 글이 없습니다. Notion 갤러리에 글이 있는지, Integration 연결을 확인해 주세요."
        }
      />

      {articles.length > 0 ? (
        <div className="gallery-articles-wrap">
          <GalleryList articles={articles} />
        </div>
      ) : null}

      <AdSlot unit="footer" />
    </main>
  );
}
