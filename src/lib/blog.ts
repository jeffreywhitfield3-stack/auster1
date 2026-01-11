// src/lib/blog.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type BlogMeta = {
  slug: string;
  title: string;
  date: string; // ISO string
  tag?: string;
  excerpt?: string;
  cover?: string; // /public path
  author?: string;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export function getAllPosts(): BlogMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const posts = files
    .map((filename) => {
      const fullPath = path.join(BLOG_DIR, filename);
      const raw = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(raw);

      const slug = filename.replace(/\.mdx?$/, "");
      const title = String(data.title ?? slug);
      const date = String(data.date ?? "");
      const tag = data.tag ? String(data.tag) : undefined;
      const excerpt = data.excerpt ? String(data.excerpt) : undefined;
      const cover = data.cover ? String(data.cover) : undefined;
      const author = data.author ? String(data.author) : undefined;

      return { slug, title, date, tag, excerpt, cover, author } satisfies BlogMeta;
    })
    .filter((p) => p.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return posts;
}

export function getPostBySlug(slug: string) {
  const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`);
  const mdPath = path.join(BLOG_DIR, `${slug}.md`);

  const filePath = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null;
  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  const meta: BlogMeta = {
    slug,
    title: String(data.title ?? slug),
    date: String(data.date ?? ""),
    tag: data.tag ? String(data.tag) : undefined,
    excerpt: data.excerpt ? String(data.excerpt) : undefined,
    cover: data.cover ? String(data.cover) : undefined,
    author: data.author ? String(data.author) : undefined,
  };

  return { meta, content };
}