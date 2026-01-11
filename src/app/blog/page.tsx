// src/app/blog/page.tsx
import Link from "next/link";
import { supabasePublic } from "@/lib/blog/supabase-public";

export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const supabase = supabasePublic();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_path, published_at, created_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  const posts = data || [];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <div className="text-2xl font-semibold text-zinc-900">Company Blog</div>
        <div className="mt-1 text-sm text-zinc-600">
          Updates, case studies, and guides for getting the most out of Auster.
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load posts: {error.message}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((p) => {
          const coverUrl =
            p.cover_path
              ? supabase.storage.from("blog-covers").getPublicUrl(p.cover_path).data.publicUrl
              : null;

          const date = p.published_at || p.created_at;

          return (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50"
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  className="mb-3 aspect-[16/9] w-full rounded-xl border border-zinc-200 object-cover"
                />
              ) : (
                <div className="mb-3 aspect-[16/9] w-full rounded-xl border border-zinc-200 bg-zinc-50" />
              )}

              <div className="text-sm text-zinc-500">
                {date ? new Date(date).toLocaleDateString() : ""}
              </div>

              <div className="mt-1 text-lg font-semibold text-zinc-900 group-hover:underline">
                {p.title}
              </div>

              <div className="mt-2 text-sm text-zinc-600">{p.excerpt}</div>
            </Link>
          );
        })}
      </div>

      {posts.length === 0 && !error ? (
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No posts yet.
        </div>
      ) : null}
    </main>
  );
}