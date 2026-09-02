"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GardenArticle } from "@/lib/notion";

type Props = {
  articles: GardenArticle[];
  pageSize?: number;
};

export function GalleryList({ articles, pageSize = 8 }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((item) => item.title.toLowerCase().includes(q));
  }, [articles, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const slice = filtered.slice(start, start + pageSize);

  return (
    <>
      <div className="gallery gallery-articles" id="articleGallery">
        {!slice.length ? (
          <div className="gallery-empty">검색 결과가 없습니다.</div>
        ) : (
          slice.map((item) => (
            <Link key={item.id} href={item.url} className="card">
              <div className="card-cover">
                {item.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverImage} alt="" loading="lazy" />
                ) : (
                  <div className="card-cover-fallback" />
                )}
              </div>
              <div className="card-body">
                <div className="card-title">{item.title}</div>
              </div>
            </Link>
          ))
        )}
      </div>

      <div
        className={`gallery-controls${filtered.length === 0 ? " is-empty" : ""}`}
        id="articleControls"
      >
        <label className="gallery-search-wrap">
          <span className="gallery-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            id="articleSearch"
            className="gallery-search"
            placeholder="글 검색"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <div
          className="gallery-pager"
          id="articlePager"
          style={{ display: totalPages > 1 ? "flex" : "none" }}
        >
          <button
            type="button"
            aria-label="이전 페이지"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ‹
          </button>
          <span className="page-info">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="다음 페이지"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            ›
          </button>
        </div>
      </div>
    </>
  );
}
