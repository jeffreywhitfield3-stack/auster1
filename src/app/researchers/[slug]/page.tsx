import { supabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import ResearcherProfileClient from "./ResearcherProfileClient";

export default async function ResearcherProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  // Fetch researcher profile
  const { data: researcher, error } = await supabase
    .from('researcher_profiles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !researcher) {
    notFound();
  }

  // Fetch researcher's published research
  const { data: researchObjects } = await supabase
    .from('research_objects')
    .select('*')
    .eq('author_id', researcher.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  // Get current user's researcher profile if authenticated
  let currentUserProfile = null;
  let isFollowing = false;
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('researcher_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    currentUserProfile = profile;

    // Check if current user is following this researcher
    if (profile && profile.id !== researcher.id) {
      const { data: followData } = await supabase
        .from('researcher_follows')
        .select('id')
        .eq('follower_id', profile.id)
        .eq('following_id', researcher.id)
        .single();

      isFollowing = !!followData;
    }
  }

  const tierColors = {
    observer: "bg-zinc-100 text-zinc-700",
    contributor: "bg-blue-100 text-blue-700",
    researcher: "bg-purple-100 text-purple-700",
    institution: "bg-emerald-100 text-emerald-700",
  };

  const tierColor = tierColors[researcher.tier as keyof typeof tierColors] || tierColors.observer;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8 rounded-lg border border-zinc-200 bg-zinc-50 p-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            {researcher.avatar_url ? (
              <img
                src={researcher.avatar_url}
                alt={researcher.display_name}
                className="h-24 w-24 rounded-full border-2 border-zinc-200"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-zinc-200 bg-blue-600 text-4xl font-bold text-white">
                {researcher.display_name[0].toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-3xl font-bold text-zinc-900">
                  {researcher.display_name}
                </h1>
                <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${tierColor}`}>
                  {researcher.tier}
                </span>
              </div>

              {researcher.bio && (
                <p className="mb-4 text-zinc-700">{researcher.bio}</p>
              )}

              <div className="mb-4 flex flex-wrap gap-4 text-sm text-zinc-600">
                <div>
                  <span className="font-semibold text-zinc-900">
                    {researcher.published_objects_count}
                  </span>{" "}
                  published
                </div>
                <div>
                  <span className="font-semibold text-zinc-900">
                    {researcher.followers_count}
                  </span>{" "}
                  followers
                </div>
                <div>
                  <span className="font-semibold text-zinc-900">
                    {researcher.following_count}
                  </span>{" "}
                  following
                </div>
                <div>
                  <span className="font-semibold text-zinc-900">
                    {researcher.discussions_count}
                  </span>{" "}
                  discussions
                </div>
                <div>
                  <span className="font-semibold text-zinc-900">
                    {researcher.citations_count}
                  </span>{" "}
                  citations
                </div>
              </div>

              {researcher.institution && (
                <p className="mb-2 text-sm text-zinc-600">
                  🏛 {researcher.institution}
                </p>
              )}

              {researcher.website && (
                <a
                  href={researcher.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  🔗 {researcher.website}
                </a>
              )}
            </div>

            {/* Follow Button */}
            {currentUserProfile && currentUserProfile.id !== researcher.id && (
              <ResearcherProfileClient
                researcherId={researcher.id}
                initialFollowing={isFollowing}
              />
            )}
          </div>
        </div>

        {/* Published Research */}
        <div>
          <h2 className="mb-6 text-2xl font-bold text-zinc-900">
            Published Research ({researchObjects?.length || 0})
          </h2>

          {researchObjects && researchObjects.length > 0 ? (
            <div className="space-y-4">
              {researchObjects.map((research) => (
                <Link
                  key={research.id}
                  href={`/research/${research.slug}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-6 hover:border-zinc-300 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h3 className="text-xl font-semibold text-zinc-900">
                      {research.title}
                    </h3>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800 capitalize">
                      {research.object_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="mb-4 text-zinc-700 line-clamp-2">
                    {research.abstract}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span>
                      {new Date(research.published_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    <span>·</span>
                    <span>👁️ {research.views_count} views</span>
                    <span>·</span>
                    <span>💬 {research.discussions_count} discussions</span>
                    <span>·</span>
                    <span>📎 {research.citations_count} citations</span>
                  </div>

                  {research.topics && research.topics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {research.topics.slice(0, 5).map((topic: string) => (
                        <span
                          key={topic}
                          className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center">
              <p className="text-zinc-600">No published research yet.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
