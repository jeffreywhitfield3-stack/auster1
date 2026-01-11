// src/app/app/admin/blog/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import AdminImageUpload from "@/components/blog/AdminImageUpload";
import { MarkdownPreview } from "@/components/blog/MarkdownPreview";
import { slugify } from "@/lib/blog/slug";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  cover_path: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminEditPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [post, setPost] = useState<Post | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  async function load() {
    setMsg("");
    const { data, error } = await supabase.from("blog_posts").select("*").eq("id", params.id).single();
    if (error) {
      setMsg(error.message);
      return;
    }
    const p = data as any as Post;
    setPost(p);

    if (p.cover_path) {
      const u = supabase.storage.from("blog-covers").getPublicUrl(p.cover_path).data.publicUrl;
      setCoverUrl(u);
    } else {
      setCoverUrl(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function save() {
    if (!post) return;
    setBusy(true);
    setMsg("");
    try {
      const cleanSlug = (post.slug || slugify(post.title)).trim();
      if (!post.title.trim()) throw new Error("Title is required.");
      if (!cleanSlug) throw new Error("Slug is required.");

      const { error } = await supabase
        .from("blog_posts")
        .update({
          title: post.title.trim(),
          slug: cleanSlug,
          excerpt: post.excerpt.trim(),
          content_md: post.content_md || "",
          cover_path: post.cover_path,
        })
        .eq("id", post.id);

      if (error) throw error;
      await load();
      setMsg("Saved.");
    } catch (e: any) {
      setMsg(e?.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function setPublished(next: boolean) {
    if (!post) return;
    setBusy(true);
    setMsg("");
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          published: next,
          published_at: next ? new Date().toISOString() : null,
        })
        .eq("id", post.id);

      if (error) throw error;
      await load();
      setMsg(next ? "Published." : "Unpublished (draft).");
    } catch (e: any) {
      setMsg(e?.message || "Publish update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!post) return;
    const ok = confirm("Delete this post? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    setMsg("");
    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
      if (error) throw error;
      router.replace("/app/admin/blog");
    } catch (e: any) {
      setMsg(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!post) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Loading…</div>
          <div className="mt-2 text-sm text-zinc-600">Fetching post.</div>
          {msg ? <div className="mt-3 text-sm text-red-700">{msg}</div> : null}
        </div>
      </main>
    );
  }

  const publicLink = post.published ? `/blog/${post.slug}` : null;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Edit post</div>
          <div className="mt-1 text-sm text-zinc-600">
            Status:{" "}
            {post.published ? (
              <span className="font-semibold text-green-700">Published</span>
            ) : (
              <span className="font-semibold text-zinc-700">Draft</span>
            )}
            {publicLink ? (
              <>
                {" "}
                ·{" "}
                <Link className="underline underline-offset-4" href={publicLink}>
                  View public
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/admin/blog"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Back
          </Link>
          <button
            disabled={busy}
            onClick={save}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            Save
          </button>
          {post.published ? (
            <button
              disabled={busy}
              onClick={() => setPublished(false)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              Unpublish
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => setPublished(true)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              Publish
            </button>
          )}
          <button
            disabled={busy}
            onClick={del}
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>

      {msg ? (
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Metadata</div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="text-sm font-medium text-zinc-800">Title</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={post.title}
                  onChange={(e) => setPost({ ...post, title: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-zinc-800">Slug</div>
                  <button
                    onClick={() => setPost({ ...post, slug: slugify(post.title) })}
                    type="button"
                    className="text-xs font-semibold text-zinc-700 underline underline-offset-4 hover:text-zinc-900"
                  >
                    Generate from title
                  </button>
                </div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
                  value={post.slug}
                  onChange={(e) => setPost({ ...post, slug: e.target.value })}
                />
              </div>

              <div>
                <div className="text-sm font-medium text-zinc-800">Excerpt</div>
                <textarea
                  className="mt-2 h-24 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={post.excerpt}
                  onChange={(e) => setPost({ ...post, excerpt: e.target.value })}
                />
              </div>
            </div>
          </div>

          <AdminImageUpload
            folder="covers"
            label="Cover image"
            onUploaded={({ path, publicUrl }) => {
              setPost({ ...post, cover_path: path });
              setCoverUrl(publicUrl);
            }}
          />

          {coverUrl ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="" className="aspect-[16/9] w-full rounded-xl border border-zinc-200 object-cover" />
              <div className="mt-2 text-xs text-zinc-500 font-mono">{post.cover_path}</div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">Content (Markdown)</div>
              <span className="text-xs text-zinc-500">You can paste images too</span>
            </div>

            <textarea
              className="mt-3 h-[340px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
              value={post.content_md}
              onChange={(e) => setPost({ ...post, content_md: e.target.value })}
            />
          </div>

          <AdminImageUpload
            folder="inline"
            label="Upload inline image (insert markdown)"
            onUploaded={({ markdown }) => {
              if (!markdown) return;
              setPost((p) =>
                p ? { ...p, content_md: `${p.content_md}${p.content_md.endsWith("\n") ? "" : "\n"}\n${markdown}\n` } : p
              );
            }}
          />

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Preview</div>
            <div className="mt-4">
              <MarkdownPreview markdown={post.content_md || ""} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}