// src/app/app/admin/blog/new/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { slugify } from "@/lib/blog/slug";
import AdminImageUpload from "@/components/blog/AdminImageUpload";
import { MarkdownPreview } from "@/components/blog/MarkdownPreview";

export default function AdminNewPostPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function autoSlug() {
    const s = slugify(title || "");
    setSlug(s);
  }

  async function create(draft = true) {
    setBusy(true);
    setMsg("");
    try {
      const cleanSlug = (slug || slugify(title)).trim();
      if (!title.trim()) throw new Error("Title is required.");
      if (!cleanSlug) throw new Error("Slug is required (or generate from title).");

      const payload = {
        title: title.trim(),
        slug: cleanSlug,
        excerpt: excerpt.trim(),
        content_md: contentMd || "",
        cover_path: coverPath,
        published: !draft,
        published_at: !draft ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from("blog_posts")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      router.replace(`/app/admin/blog/${data.id}`);
    } catch (e: any) {
      setMsg(e?.message || "Failed to create post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">New blog post</div>
          <div className="mt-1 text-sm text-zinc-600">Write a draft, then publish when ready.</div>
        </div>
        <Link
          href="/app/admin/blog"
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Back
        </Link>
      </div>

      {msg ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{msg}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Post metadata</div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="text-sm font-medium text-zinc-800">Title</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Introducing Austerian’s Derivatives Lab"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-zinc-800">Slug</div>
                  <button
                    onClick={autoSlug}
                    type="button"
                    className="text-xs font-semibold text-zinc-700 underline underline-offset-4 hover:text-zinc-900"
                  >
                    Generate from title
                  </button>
                </div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="introducing-austerian-derivatives"
                />
              </div>

              <div>
                <div className="text-sm font-medium text-zinc-800">Excerpt</div>
                <textarea
                  className="mt-2 h-24 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="A short summary shown on the blog index."
                />
              </div>
            </div>
          </div>

          <AdminImageUpload
            folder="covers"
            label="Cover image (optional)"
            onUploaded={({ path, publicUrl }) => {
              setCoverPath(path);
              setCoverUrl(publicUrl);
            }}
          />

          {coverUrl ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="" className="aspect-[16/9] w-full rounded-xl border border-zinc-200 object-cover" />
              <div className="mt-2 text-xs text-zinc-500 font-mono">{coverPath}</div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => create(true)}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              disabled={busy}
              onClick={() => create(false)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              Publish now
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">Content (Markdown)</div>
              <span className="text-xs text-zinc-500">Supports links, tables, code, images</span>
            </div>

            <textarea
              className="mt-3 h-[340px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
              value={contentMd}
              onChange={(e) => setContentMd(e.target.value)}
              placeholder={`# Heading\n\nWrite your post here.\n\n![alt](https://...)`}
            />
          </div>

          <AdminImageUpload
            folder="inline"
            label="Upload an inline image (inserts markdown)"
            onUploaded={({ markdown }) => {
              if (!markdown) return;
              setContentMd((prev) => `${prev}${prev.endsWith("\n") ? "" : "\n"}\n${markdown}\n`);
            }}
          />

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Preview</div>
            <div className="mt-4">
              <MarkdownPreview markdown={contentMd || ""} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}