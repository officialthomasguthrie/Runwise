/** Landscape cover: shown at **16:9** (`aspect-video`). `src` is under `public/` (e.g. `/blog/covers/slug.jpg`). */
export type BlogCoverImage = {
  src: string;
  alt: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  /** Display name for the byline. */
  author: string;
  /** ISO date `YYYY-MM-DD` */
  date: string;
  /** `false` keeps the post out of the index and returns 404 at its URL until you flip it. */
  published: boolean;
  coverImage: BlogCoverImage;
  /** One string per paragraph (plain text; line breaks within a string are ignored). */
  paragraphs: string[];
  /** Optional primary action below the article body (e.g. signup). */
  cta?: { label: string; href: string };
};
