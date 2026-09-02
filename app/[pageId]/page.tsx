import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/AdSlot";
import { NotionBlocks } from "@/components/NotionBlocks";
import { NotionStatusNote } from "@/components/NotionStatusNote";
import { CATEGORIES, isCategoryId, normalizePageId } from "@/lib/categories";
import {
  getArticleById,
  getBlockChildren,
  getPublishedArticles,
} from "@/lib/notion";

export const revalidate = 60;

type Params = { pageId: string };

const RESERVED = new Set(["ttong", "pink", "oasis", "api", "magic-glasses", "privacy"]);

export async function generateStaticParams() {
  const { articles } = await getPublishedArticles();
  return articles.map((a) => ({ pageId: a.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { pageId } = await params;
  if (RESERVED.has(pageId)) return {};
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

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { pageId } = await params;
  if (RESERVED.has(pageId) || isCategoryId(pageId)) notFound();

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

  const blocks = await getBlockChildren(normalizePageId(article.id));
  const category = CATEGORIES[article.category];

  return (
    <main className="page page-narrow">
      <Link href={`/${article.category}`} className="back-link">
        ← {category.emoji} {category.title}
      </Link>
      <h1 className="page-title">{article.title}</h1>
      {article.date ? <p className="article-meta">{article.date}</p> : null}

      {article.coverImage ? (
        <div className="article-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.coverImage} alt="" />
        </div>
      ) : null}

      <AdSlot unit="banner" />

      <NotionBlocks blocks={blocks} insertAdAfter={3} />

      <AdSlot unit="footer" />
    </main>
  );
}
