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

  // --------- auth gate (robust) ----------
  async function checkAccess() {
    setChecking(true);
    setAccessErr("");

    try {
      // 1) try fast session read
      let sessionEmail: string | null = null;

      try {
        const sessionRes: any = await withTimeout(supabase.auth.getSession() as any, 2500, "getSession timeout");
        sessionEmail = sessionRes?.data?.session?.user?.email ?? null;
      } catch {
        // ignore, fall back to getUser
      }

      // 2) fallback: getUser (server verification)
      if (!sessionEmail) {
        try {
          const userRes: any = await withTimeout(supabase.auth.getUser() as any, 5000, "getUser timeout");
          sessionEmail = userRes?.data?.user?.email ?? null;
        } catch (e: any) {
          // still allow onAuthStateChange to resolve later
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

    // initial check
    checkAccess();

    // update if auth state changes (late cookie/session, sign in/out, refresh token)
    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!alive) return;
      const e = session?.user?.email ?? null;
      setEmail(e);
      setIsAdmin((e || "").toLowerCase() === ADMIN_EMAIL.toLowerCase());
      setChecking(false);
    });

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
    if (!confirm("Delete this post?")) return;

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
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Loading…</div>
          <div className="mt-2 text-sm text-zinc-600">Checking admin access.</div>

          {accessErr ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {accessErr}
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              onClick={checkAccess}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Retry
            </button>
            <button
              onClick={() => router.replace("/login?next=/app/admin/blog")}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
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
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Admin Blog</div>
          <div className="mt-2 text-sm text-zinc-600">
            Signed in as: <span className="font-semibold">{email ?? "—"}</span>
          </div>
          <div className="mt-3 text-sm text-zinc-600">
            This page is restricted to <span className="font-semibold">{ADMIN_EMAIL}</span>.
          </div>

          <div className="mt-4 flex gap-2">
            <Link href="/blog" className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
              View blog
            </Link>
            <button
              onClick={() => router.replace("/login?next=/app/admin/blog")}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Switch account
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Blog Dashboard</div>
          <div className="mt-1 text-sm text-zinc-600">Create posts, upload covers, and publish.</div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/admin/briefs"
            className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            📧 Weekly Briefs
          </Link>
          <button
            onClick={createNew}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            New post
          </button>
          <Link
            href="/blog"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            View blog
          </Link>
        </div>
      </div>

      {err ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-zinc-900">Posts</div>

            {loadingPosts ? (
              <div className="p-3 text-sm text-zinc-600">Loading…</div>
            ) : posts.length === 0 ? (
              <div className="p-3 text-sm text-zinc-600">No posts yet.</div>
            ) : (
              <div className="space-y-1">
                {posts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveId(p.id)}
                    className={[
                      "w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-zinc-50",
                      activeId === p.id ? "bg-zinc-50" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-zinc-900">{p.title || "Untitled"}</div>
                      <div
                        className={[
                          "rounded-lg px-2 py-1 text-xs font-semibold",
                          p.published ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700",
                        ].join(" ")}
                      >
                        {p.published ? "Published" : "Draft"}
                      </div>
                    </div>
                    <div className="mt-1 truncate text-xs text-zinc-600">/{p.slug}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={loadPosts}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          {!active ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm text-sm text-zinc-600">
              Select a post to edit.
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Editor</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    Public URL:{" "}
                    <Link href={`/blog/${active.slug}`} className="font-semibold text-zinc-900 underline">
                      /blog/{active.slug}
                    </Link>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={togglePublish}
                    className={[
                      "rounded-xl px-3 py-2 text-sm font-semibold",
                      active.published
                        ? "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                        : "bg-zinc-900 text-white hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    {active.published ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    onClick={del}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Title</div>
                  <input
                    value={active.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setPosts((prev) => prev.map((x) => (x.id === active.id ? { ...x, title } : x)));
                    }}
                    onBlur={() => savePatch({ title: active.title })}
                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-zinc-900">Slug</div>
                    <button
                      onClick={() => {
                        const next = slugify(active.title || "post");
                        setPosts((prev) => prev.map((x) => (x.id === active.id ? { ...x, slug: next } : x)));
                        setTimeout(() => savePatch({ slug: next }), 0);
                      }}
                      className="text-xs font-semibold text-zinc-900 underline"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <input
                    value={active.slug}
                    onChange={(e) => {
                      const slug = e.target.value;
                      setPosts((prev) => prev.map((x) => (x.id === active.id ? { ...x, slug } : x)));
                    }}
                    onBlur={() => savePatch({ slug: active.slug })}
                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <div className="text-sm font-semibold text-zinc-900">Excerpt</div>
                  <textarea
                    value={active.excerpt}
                    onChange={(e) => {
                      const excerpt = e.target.value;
                      setPosts((prev) => prev.map((x) => (x.id === active.id ? { ...x, excerpt } : x)));
                    }}
                    onBlur={() => savePatch({ excerpt: active.excerpt })}
                    className="mt-2 h-24 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <div className="text-sm font-semibold text-zinc-900">Cover image</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {coverUrl(active) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt="cover"
                        src={coverUrl(active) as string}
                        className="h-20 w-32 rounded-xl object-cover border border-zinc-200"
                      />
                    ) : (
                      <div className="flex h-20 w-32 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
                        No cover
                      </div>
                    )}

                    <label className="cursor-pointer rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
                      Upload cover
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

                <div>
                  <div className="text-sm font-semibold text-zinc-900">Content (Markdown)</div>
                  <textarea
                    value={active.content_md}
                    onChange={(e) => {
                      const content_md = e.target.value;
                      setPosts((prev) => prev.map((x) => (x.id === active.id ? { ...x, content_md } : x)));
                    }}
                    onBlur={() => savePatch({ content_md: active.content_md })}
                    className="mt-2 h-[420px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}