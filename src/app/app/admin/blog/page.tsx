"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ADMIN_EMAIL = "jeffreywhitfield3@gmail.com";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  cover_path: string | null;
  published: boolean;
  published_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function withTimeout<T>(p: Promise<T>, ms: number, msg = "timeout"): Promise<T> {
  let t: any;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, rej) => {
        t = setTimeout(() => rej(new Error(msg)), ms);
      }),
    ]);
  } finally {
    clearTimeout(t);
  }
}

export default function AdminBlogPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessErr, setAccessErr] = useState<string>("");

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [err, setErr] = useState<string>("");

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = posts.find((p) => p.id === activeId) ?? null;

  // Stats
  const stats = {
    total: posts.length,
    published: posts.filter((p) => p.published).length,
    drafts: posts.filter((p) => !p.published).length,
  };

  // --------- auth gate (robust) ----------
  async function checkAccess() {
    setChecking(true);
    setAccessErr("");

    try {
      let sessionEmail: string | null = null;

      try {
        const sessionRes: any = await withTimeout(
          supabase.auth.getSession() as any,
          2500,
          "getSession timeout"
        );
        sessionEmail = sessionRes?.data?.session?.user?.email ?? null;
      } catch {
        // ignore, fall back to getUser
      }

      if (!sessionEmail) {
        try {
          const userRes: any = await withTimeout(
            supabase.auth.getUser() as any,
            5000,
            "getUser timeout"
          );
          sessionEmail = userRes?.data?.user?.email ?? null;
        } catch (e: any) {
          setAccessErr(String(e?.message || e));
        }
      }

      setEmail(sessionEmail);
      const ok = (sessionEmail || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setIsAdmin(ok);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    let alive = true;

    checkAccess();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        if (!alive) return;
        const e = session?.user?.email ?? null;
        setEmail(e);
        setIsAdmin((e || "").toLowerCase() === ADMIN_EMAIL.toLowerCase());
        setChecking(false);
      }
    );

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // --------- data ----------
  async function loadPosts() {
    setLoadingPosts(true);
    setErr("");

    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setPosts([]);
      setActiveId(null);
    } else {
      const rows = (data as any) ?? [];
      setPosts(rows);
      setActiveId(rows[0]?.id ?? null);
    }

    setLoadingPosts(false);
  }

  useEffect(() => {
    if (!checking && isAdmin) loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, isAdmin]);

  async function createNew() {
    setErr("");
    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        title: "New post",
        slug: `new-${Date.now()}`,
        excerpt: "",
        content_md: "",
        cover_path: null,
        published: false,
        published_at: null,
      })
      .select("*")
      .single();

    if (error) return setErr(error.message);

    setPosts((p) => [data as any, ...p]);
    setActiveId((data as any).id);
  }

  async function savePatch(patch: Partial<BlogPost>) {
    if (!active) return;
    setErr("");

    const { data, error } = await supabase
      .from("blog_posts")
      .update(patch)
      .eq("id", active.id)
      .select("*")
      .single();

    if (error) return setErr(error.message);

    setPosts((prev) => prev.map((x) => (x.id === active.id ? (data as any) : x)));
  }

  async function togglePublish() {
    if (!active) return;
    const next = !active.published;
    await savePatch({
      published: next,
      published_at: next ? new Date().toISOString() : null,
    });
  }

  async function del() {
    if (!active) return;
    if (!confirm("Delete this post? This action cannot be undone.")) return;

    setErr("");
    const { error } = await supabase.from("blog_posts").delete().eq("id", active.id);
    if (error) return setErr(error.message);

    const remaining = posts.filter((x) => x.id !== active.id);
    setPosts(remaining);
    setActiveId(remaining[0]?.id ?? null);
  }

  async function uploadCover(file: File) {
    if (!active) return;
    setErr("");

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${active.id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("blog-covers").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (upErr) return setErr(upErr.message);

    await savePatch({ cover_path: path });
  }

  function coverUrl(p: BlogPost) {
    if (!p.cover_path) return null;
    return supabase.storage.from("blog-covers").getPublicUrl(p.cover_path).data.publicUrl;
  }

  // ---------- UI ----------
  if (checking) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Checking access...</div>
          <div className="mt-2 text-sm text-zinc-600">
            Verifying admin permissions.
          </div>

          {accessErr ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {accessErr}
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              onClick={checkAccess}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Retry
            </button>
            <button
              onClick={() => router.replace("/login?next=/app/admin/blog")}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Go to login
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Access Denied</div>
          <div className="mt-2 text-sm text-zinc-600">
            Signed in as: <span className="font-semibold">{email ?? "—"}</span>
          </div>
          <div className="mt-3 text-sm text-zinc-600">
            This page is restricted to{" "}
            <span className="font-semibold">{ADMIN_EMAIL}</span>.
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href="/blog"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              View blog
            </Link>
            <button
              onClick={() => router.replace("/login?next=/app/admin/blog")}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Switch account
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Content Management
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Manage blog posts and weekly market briefs
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/app/admin/briefs"
              className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Weekly Briefs
            </Link>
            <Link
              href="/blog"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              View blog
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Total Posts
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-900">
              {stats.total}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Published
            </div>
            <div className="mt-2 text-2xl font-semibold text-emerald-600">
              {stats.published}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Drafts
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-600">
              {stats.drafts}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {err ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Sidebar - Posts list */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Blog Posts</h2>
              <button
                onClick={createNew}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                + New
              </button>
            </div>

            {loadingPosts ? (
              <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
                Loading posts...
              </div>
            ) : posts.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-sm text-zinc-600">No posts yet</div>
                <button
                  onClick={createNew}
                  className="mt-3 text-sm font-semibold text-zinc-900 underline"
                >
                  Create your first post
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {posts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveId(p.id)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      activeId === p.id
                        ? "bg-zinc-100"
                        : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-zinc-900">
                          {p.title || "Untitled"}
                        </div>
                        <div className="mt-1 truncate text-xs text-zinc-500">
                          /{p.slug}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          p.published
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {p.published ? "Live" : "Draft"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={loadPosts}
              className="mt-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Main content - Editor */}
        <div className="lg:col-span-8">
          {!active ? (
            <div className="flex h-96 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="text-center">
                <div className="text-sm text-zinc-600">
                  Select a post to edit or create a new one
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Editor header */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-zinc-900">
                      Edit Post
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span>Public URL:</span>
                      <Link
                        href={`/blog/${active.slug}`}
                        className="font-mono font-semibold text-blue-600 hover:underline"
                      >
                        /blog/{active.slug}
                      </Link>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={togglePublish}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                        active.published
                          ? "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                          : "bg-zinc-900 text-white hover:bg-zinc-800"
                      }`}
                    >
                      {active.published ? "Unpublish" : "Publish"}
                    </button>

                    <button
                      onClick={del}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor form */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-900">
                      Title
                    </label>
                    <input
                      value={active.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setPosts((prev) =>
                          prev.map((x) => (x.id === active.id ? { ...x, title } : x))
                        );
                      }}
                      onBlur={() => savePatch({ title: active.title })}
                      className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                      placeholder="Enter post title..."
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-zinc-900">
                        Slug
                      </label>
                      <button
                        onClick={() => {
                          const next = slugify(active.title || "post");
                          setPosts((prev) =>
                            prev.map((x) => (x.id === active.id ? { ...x, slug: next } : x))
                          );
                          setTimeout(() => savePatch({ slug: next }), 0);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Auto-generate
                      </button>
                    </div>
                    <input
                      value={active.slug}
                      onChange={(e) => {
                        const slug = e.target.value;
                        setPosts((prev) =>
                          prev.map((x) => (x.id === active.id ? { ...x, slug } : x))
                        );
                      }}
                      onBlur={() => savePatch({ slug: active.slug })}
                      className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm focus:border-zinc-400 focus:outline-none"
                      placeholder="post-slug"
                    />
                  </div>

                  {/* Excerpt */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-900">
                      Excerpt
                    </label>
                    <textarea
                      value={active.excerpt}
                      onChange={(e) => {
                        const excerpt = e.target.value;
                        setPosts((prev) =>
                          prev.map((x) => (x.id === active.id ? { ...x, excerpt } : x))
                        );
                      }}
                      onBlur={() => savePatch({ excerpt: active.excerpt })}
                      className="mt-2 h-20 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                      placeholder="Short description for previews and SEO..."
                    />
                  </div>

                  {/* Cover image */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-900">
                      Cover Image
                    </label>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {coverUrl(active) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt="cover"
                          src={coverUrl(active) as string}
                          className="h-24 w-40 rounded-lg border border-zinc-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-500">
                          No cover
                        </div>
                      )}

                      <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
                        Upload
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
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-900">
                      Content (Markdown)
                    </label>
                    <textarea
                      value={active.content_md}
                      onChange={(e) => {
                        const content_md = e.target.value;
                        setPosts((prev) =>
                          prev.map((x) =>
                            x.id === active.id ? { ...x, content_md } : x
                          )
                        );
                      }}
                      onBlur={() => savePatch({ content_md: active.content_md })}
                      className="mt-2 h-96 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs focus:border-zinc-400 focus:outline-none"
                      placeholder="# Your content here...

Use Markdown formatting."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
