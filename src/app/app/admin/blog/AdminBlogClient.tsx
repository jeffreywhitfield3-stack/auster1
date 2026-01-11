"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  cover_url: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleString();
}

async function fileToArrayBuffer(file: File) {
  return await file.arrayBuffer();
}

export default function AdminBlogClient({ adminEmail }: { adminEmail: string }) {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [err, setErr] = useState<string>("");

  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  // editor fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [published, setPublished] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr("");

    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setErr(error.message);
    setPosts((data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    setEditing(null);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContent("");
    setCoverUrl("");
    setPublished(false);
  }

  function startEdit(p: BlogPost) {
    setEditing(p);
    setTitle(p.title || "");
    setSlug(p.slug || "");
    setExcerpt(p.excerpt || "");
    setContent(p.content_md || "");
    setCoverUrl(p.cover_url || "");
    setPublished(!!p.published);
  }

  async function uploadCover(file: File) {
    setCoverUploading(true);
    setErr("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

      const buf = await fileToArrayBuffer(file);

      const { error: upErr } = await supabase.storage
        .from("blog-covers")
        .upload(path, buf, {
          contentType: file.type || "image/png",
          upsert: false,
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("blog-covers").getPublicUrl(path);
      setCoverUrl(data.publicUrl);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setCoverUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr("");
    try {
      const slugFinal = slug.trim() || slugify(title);
      if (!title.trim()) throw new Error("Title is required.");
      if (!slugFinal) throw new Error("Slug is required (or title must produce a slug).");

      const payload = {
        title: title.trim(),
        slug: slugFinal,
        excerpt: excerpt.trim(),
        content_md: content,
        cover_url: coverUrl.trim(),
        published,
        published_at: published ? new Date().toISOString() : null,
      };

      if (editing?.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }

      await refresh();
      startNew();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: BlogPost) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setErr("");
    const { error } = await supabase.from("blog_posts").delete().eq("id", p.id);
    if (error) setErr(error.message);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Blog Admin</div>
          <div className="mt-1 text-sm text-zinc-600">
            Only <span className="font-semibold">{adminEmail}</span> can create/edit/publish.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/blog" className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
            View blog
          </Link>
          <button
            onClick={startNew}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            New post
          </button>
        </div>
      </div>

      {err ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{err}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: list */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Posts</div>
            <div className="mt-1 text-xs text-zinc-500">Click a post to edit.</div>

            {loading ? (
              <div className="mt-4 text-sm text-zinc-600">Loading…</div>
            ) : (
              <div className="mt-4 space-y-2">
                {posts.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-zinc-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <button onClick={() => startEdit(p)} className="text-left">
                        <div className="text-sm font-semibold text-zinc-900">{p.title}</div>
                        <div className="mt-1 text-xs text-zinc-500">
                          /blog/{p.slug} • {p.published ? "Published" : "Draft"} • {fmtDate(p.updated_at)}
                        </div>
                      </button>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/blog/${p.slug}`}
                          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                        >
                          Open
                        </Link>
                        <button
                          onClick={() => remove(p)}
                          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {posts.length === 0 ? <div className="text-sm text-zinc-600">No posts yet.</div> : null}
              </div>
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900">{editing ? "Edit post" : "New post"}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  Covers are uploaded to Supabase Storage bucket <span className="font-semibold">blog-covers</span>.
                </div>
              </div>

              <label className="cursor-pointer rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
                {coverUploading ? "Uploading…" : "Upload cover"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadCover(f);
                  }}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <div className="text-xs font-semibold text-zinc-800">Title</div>
                <input
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={title}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTitle(v);
                    if (!editing && !slug.trim()) setSlug(slugify(v));
                  }}
                  placeholder="Post title"
                />
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold text-zinc-800">Slug</div>
                <input
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-mono"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-post-slug"
                />
                <div className="text-xs text-zinc-500">URL: /blog/{slug || "your-slug"}</div>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold text-zinc-800">Excerpt</div>
                <textarea
                  className="h-20 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Short summary for the feed…"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-800">Content (Markdown)</div>
                  <div className="text-xs text-zinc-500">Headings: #, ##, ### and **bold** supported</div>
                </div>
                <textarea
                  className="h-[420px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`# Your title\n\nWrite content here...`}
                />
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold text-zinc-800">Cover URL</div>
                <input
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://..."
                />
                {coverUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverUrl} alt="Cover preview" className="w-full object-cover" />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Publish (visible on /blog)
                </label>

                <div className="flex items-center gap-2">
                  <button
                    disabled={saving}
                    onClick={save}
                    className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : editing ? "Save changes" : "Create post"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            Tip: add a link to your admin in the address bar: <span className="font-mono">/admin/blog</span>
          </div>
        </div>
      </div>
    </main>
  );
}