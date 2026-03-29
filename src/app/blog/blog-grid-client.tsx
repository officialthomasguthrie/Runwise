"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import type { BlogPost } from "@/content/blog/types";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-NZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(`${iso}T12:00:00`));
  } catch {
    return iso;
  }
}

type Props = {
  posts: BlogPost[];
};

export function BlogGridClient({ posts }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(t) ||
        p.description.toLowerCase().includes(t) ||
        p.author.toLowerCase().includes(t) ||
        p.date.includes(t) ||
        p.paragraphs.some((para) => para.toLowerCase().includes(t)),
    );
  }, [posts, query]);

  return (
    <div className="mt-8 w-full max-w-7xl sm:mt-10 md:mt-12">
      <div className="mx-auto w-full max-w-xl sm:max-w-2xl">
        <label htmlFor="blog-search" className="sr-only">
          Search blog posts
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#1a1a1a]/35"
            aria-hidden
          />
          <input
            id="blog-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, topic…"
            autoComplete="off"
            className="w-full border border-black/[0.12] bg-white py-3 pr-4 pl-10 text-[14px] text-[#1a1a1a] shadow-[0_1px_0_rgba(0,0,0,0.04)] outline-none placeholder:text-[#1a1a1a]/40 focus:border-black/[0.22] focus:ring-1 focus:ring-black/[0.08]"
          />
        </div>
      </div>

      {posts.length === 0 ? (
        <div
          className="mt-10 border border-dashed border-black/[0.12] bg-white/40 px-6 py-14 text-center sm:px-10 sm:py-16"
          role="status"
        >
          <p className="text-[15px] font-medium text-[#1a1a1a] sm:text-base">No posts yet</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[#1a1a1a]/55 sm:text-sm">
            We&apos;re preparing the first articles. Check back soon.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 border border-black/[0.08] bg-white px-6 py-12 text-center">
          <p className="text-[15px] font-medium text-[#1a1a1a]">No posts match your search</p>
          <p className="mt-2 text-[13px] text-[#1a1a1a]/55">Try different keywords or clear the search.</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-4 text-[13px] font-medium text-[#bd28b3ba] underline-offset-2 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <ul className="mt-10 grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {filtered.map((post) => {
            const inner = (
              <article
                className={`flex h-full min-h-0 flex-col overflow-hidden border border-black/[0.1] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition ${post.published ? "group-hover:border-black/[0.16]" : "opacity-80"}`}
              >
                <div className="relative aspect-video w-full shrink-0 bg-[#eae8e4]">
                  <Image
                    src={post.coverImage.src}
                    alt={post.coverImage.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 border-t border-black/[0.06] bg-white p-4 sm:p-5">
                  <div className="flex min-h-[3.25rem] flex-wrap items-start gap-2 sm:min-h-[3.5rem]">
                    <h2 className="line-clamp-2 min-h-0 flex-1 text-left text-[16px] font-medium leading-snug tracking-tight text-[#1a1a1a] sm:text-[17px]">
                      {post.title}
                    </h2>
                    {!post.published ? (
                      <span className="shrink-0 border border-black/[0.12] bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#1a1a1a]/55">
                        Draft
                      </span>
                    ) : null}
                  </div>
                  <p className="min-h-[4.5rem] line-clamp-3 text-left text-[13px] leading-relaxed text-[#1a1a1a]/60 sm:min-h-[4.875rem]">
                    {post.description}
                  </p>
                  <div className="min-h-0 flex-1" aria-hidden />
                  <div className="flex flex-wrap items-end justify-between gap-2 text-[11px] text-[#1a1a1a]/50 sm:text-xs">
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    <span className="font-medium text-[#1a1a1a]/65">{post.author}</span>
                  </div>
                  {post.published ? (
                    <span className="inline-flex text-[13px] font-medium text-[#bd28b3ba] group-hover:underline">
                      Read article
                    </span>
                  ) : (
                    <span className="text-[13px] font-medium text-[#1a1a1a]/40">Not published yet</span>
                  )}
                </div>
              </article>
            );

            return (
              <li key={post.slug} className="flex h-full min-h-0">
                {post.published ? (
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex h-full min-h-0 w-full min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bd28b3ba] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f3ef]"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex h-full min-h-0 w-full cursor-default">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
