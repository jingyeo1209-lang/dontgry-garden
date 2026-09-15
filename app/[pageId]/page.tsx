import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdSlot } from "@/components/AdSlot";
import { NotionBlocks } from "@/components/NotionBlocks";
import { NotionStatusNote } from "@/components/NotionStatusNote";
import { TodoChecklistRuntime } from "@/components/TodoChecklistRuntime";
import { CATEGORIES, isCategoryId, normalizePageId } from "@/lib/categories";
import { getArticleById, getBlockTree, type GardenArticle } from "@/lib/notion";
import { isPublicArticleId } from "@/lib/public-articles";

/** On-demand ISR: do not prerender all Notion articles at build (avoids API 429). */
export const revalidate = 300;
export const dynamic = "force-static";
export const fetchCache = "force-cache";
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Params = { pageId: string };

const RESERVED = new Set([
  "ttong",
  "pink",
  "oasis",
  "api",
  "magic-glasses",
  "privacy",
]);

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { pageId } = await params;
  if (RESERVED.has(pageId)) return {};
  if (!isPublicArticleId(pageId)) {
    return { title: "준비 중이에요" };
  }
  const { article } = await getArticleById(pageId);
  if (!article) {
    return { title: "글을 찾을 수 없습니다" };
  }
  return {
    title: article.title,
    description: article.summary || article.title,
    openGraph: {
      title: article.title,
      description: article.summary || article.title,
      images: article.coverImage ? [article.coverImage] : ["/garden-map.png"],
    },
  };
}

async function ArticleBody({ article }: { article: GardenArticle }) {
  const { blocks, childMap } = await getBlockTree(normalizePageId(article.id));
  const hasBodyImage = blocks.some((block) => "type" in block && block.type === "image");
  const showHero = Boolean(article.coverImage) && !hasBodyImage;

  return (
    <>
      {showHero && article.coverImage ? (
        <div className="article-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.coverImage}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      ) : null}

      <AdSlot unit="banner" />

      <NotionBlocks
        blocks={blocks}
        childMap={childMap}
        insertAdAfter={3}
        skipImageBlockIds={
          hasBodyImage
            ? []
            : article.coverFallbackBlockId
              ? [article.coverFallbackBlockId]
              : []
        }
      />

      <AdSlot unit="footer" />
    </>
  );
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { pageId } = await params;
  if (RESERVED.has(pageId) || isCategoryId(pageId)) notFound();

  if (!isPublicArticleId(pageId)) {
    return (
      <main className="page page-narrow">
        <Link href="/" className="back-link">
          ← 대문으로 돌아가기
        </Link>
        <h1 className="page-title">준비 중이에요</h1>
        <p className="page-desc">다른 글은 곧 공개할게요.</p>
      </main>
    );
  }

  const { article, config, error } = await getArticleById(pageId);
  if (!article) {
    if (!config.hasToken || error) {
      return (
        <main className="page page-narrow">
          <Link href="/" className="back-link">
            ← 대문으로 돌아가기
          </Link>
          <NotionStatusNote config={config} error={error} articleCount={0} />
        </main>
      );
    }
    notFound();
  }

  const category = CATEGORIES[article.category];

  return (
    <main className="page page-narrow">
      <Link href={`/${article.category}`} className="back-link">
        ← {category.emoji} {category.title}
      </Link>
      <h1 className="page-title">{article.title}</h1>
      {article.date ? <p className="article-meta">{article.date}</p> : null}
      <TodoChecklistRuntime />

      <Suspense fallback={<div className="notion-body" />}>
        <ArticleBody article={article} />
      </Suspense>
    </main>
  );
}
