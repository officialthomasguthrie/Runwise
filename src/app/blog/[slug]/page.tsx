import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FloatingHeader } from "@/components/landing/layout/floating-header";
import { LegalDocumentFooter } from "@/components/landing/layout/legal-document-footer";
import { getPostBySlug, getPublishedPosts } from "@/content/blog/posts";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post | Runwise" };
  return {
    title: `${post.title} | Runwise Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: post.coverImage.src, alt: post.coverImage.alt }],
    },
  };
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-NZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(`${iso}T12:00:00`));
  } catch {
    return iso;
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="landing-page min-h-screen bg-[#f5f3ef] text-black">
      <FloatingHeader />

      <article className="pb-16 pt-16 sm:pb-20 sm:pt-20 md:pb-24 md:pt-24">
        <div className="mx-auto w-full max-w-[720px] px-4 sm:px-6">
          <Link
            href="/blog"
            className="inline-flex text-[13px] font-medium text-[#1a1a1a]/55 transition hover:text-[#1a1a1a]"
          >
            ← Back to blog
          </Link>

          <header className="mt-8 border-b border-black/[0.06] pb-8">
            <h1 className="text-[28px] font-medium leading-[1.12em] -tracking-[.02em] text-[#1a1a1a] sm:text-[34px] md:text-[40px]">
              {post.title}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#1a1a1a]/50 sm:text-sm">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span aria-hidden className="text-[#1a1a1a]/25">
                ·
              </span>
              <span>{post.author}</span>
            </p>
            <div className="relative mt-6 aspect-video w-full overflow-hidden bg-black/[0.06] ring-1 ring-black/[0.06]">
              <Image
                src={post.coverImage.src}
                alt={post.coverImage.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 720px"
                priority
              />
            </div>
            <p className="mt-6 text-[15px] leading-relaxed text-[#1a1a1a]/60 sm:text-base">
              {post.description}
            </p>
          </header>

          <div className="mt-10 space-y-5 text-[15px] leading-[1.7] text-[#1a1a1a]/85 sm:text-base">
            {post.paragraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {post.cta ? (
            <div className="mt-12 border-t border-black/[0.06] pt-10">
              <Link
                href={post.cta.href}
                className="inline-flex items-center justify-center rounded-md bg-[#1a1a1a] px-5 py-2.5 text-[15px] font-medium text-white transition hover:bg-[#1a1a1a]/90"
              >
                {post.cta.label}
              </Link>
            </div>
          ) : null}
        </div>
      </article>

      <LegalDocumentFooter />
    </main>
  );
}
