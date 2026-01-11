// src/app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "jeffreywhitfield3@gmail.com";

function fmtDate(d?: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const preview = sp.preview === "1" || sp.preview === "true";

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  // Only admins can preview drafts.
  const allowDraft = preview && isAdmin;

  // Fetch post by slug.
  // NOTE: If you use different columns (e.g., body_md, body_html), adjust here.
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, body_html, cover_url, cover_path, published, published_at, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    // If DB error, treat as not found (keeps UX clean)
    notFound();
  }
  if (!post) notFound();

  // Enforce publish visibility
  if (!post.published && !allowDraft) notFound();

  const coverSrc = post.cover_url || (post.cover_path ? post.cover_path : null);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <Link href="/blog" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
          ← Back to blog
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {post.published ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            Published
          </span>
        ) : (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Draft
          </span>
        )}
        <div className="text-xs text-zinc-500">
          {fmtDate(post.published_at || post.created_at)}
        </div>
      </div>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900">{post.title}</h1>
      {post.excerpt ? <p className="mt-2 text-base text-zinc-600">{post.excerpt}</p> : null}

      {coverSrc ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {/* If coverSrc is a full URL, Image will work if domain is allowed in next.config.
              If it’s a path, render img tag instead. */}
          {coverSrc.startsWith("http") ? (
            <div className="relative h-64 w-full">
              <Image src={coverSrc} alt={post.title} fill className="object-cover" />
            </div>
          ) : (
            // fallback
            <img src={coverSrc} alt={post.title} className="h-64 w-full object-cover" />
          )}
        </div>
      ) : null}

      <article className="prose prose-zinc mt-8 max-w-none">
        {/* body_html is expected. If you store markdown instead, tell me and I’ll swap in a markdown renderer. */}
        <div dangerouslySetInnerHTML={{ __html: post.body_html || "" }} />
      </article>

      {isAdmin ? (
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          <div className="font-semibold text-zinc-900">Admin</div>
          <div className="mt-1">
            Preview drafts with:{" "}
            <span className="font-mono">?preview=1</span>
          </div>
        </div>
      ) : null}
    </main>
  );
}