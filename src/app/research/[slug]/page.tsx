import { supabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import ResearchViewClient from "./ResearchViewClient";
import CitationsSection from "@/components/research/CitationsSection";
import ResearchActions from "@/components/research/ResearchActions";
import ForkWorkspaceButton from "@/components/research/ForkWorkspaceButton";

export default async function ResearchViewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  // Fetch research object with author info
  const { data: research, error } = await supabase
    .from('research_objects')
    .select(`
      *,
      author:researcher_profiles!author_id (
        id,
        display_name,
        slug,
        avatar_url,
        tier,
        followers_count
      )
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !research) {
    notFound();
  }

  // Increment view count
  await supabase
    .from('research_objects')
    .update({ views_count: research.views_count + 1 })
    .eq('id', research.id);

  // Get current user's researcher profile if authenticated
  let currentUserProfile = null;
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('researcher_profiles')
      .select('id, tier')
      .eq('user_id', user.id)
      .single();
    currentUserProfile = profile;
  }

  // Fetch workspace if this research has one
  let workspace = null;
  if (research.lab_workspace_id) {
    const { data: workspaceData } = await supabase
      .from('lab_workspaces')
      .select('id, name, lab_type')
      .eq('id', research.lab_workspace_id)
      .single();
    workspace = workspaceData;
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/research/browse" className="hover:text-zinc-900">
              Research
            </Link>
            <span>/</span>
            <span className="text-zinc-900">{research.title}</span>
          </div>

          <h1 className="mb-4 text-4xl font-bold text-zinc-900">
            {research.title}
          </h1>

          {/* Author Info */}
          <div className="mb-6 flex items-center gap-4">
            <Link
              href={`/researchers/${research.author.slug}`}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 hover:bg-zinc-100"
            >
              {research.author.avatar_url ? (
                <img
                  src={research.author.avatar_url}
                  alt={research.author.display_name}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {research.author.display_name[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium text-zinc-900">
                  {research.author.display_name}
                </div>
                <div className="text-sm text-zinc-500 capitalize">
                  {research.author.tier} · {research.author.followers_count} followers
                </div>
              </div>
            </Link>

            {/* Stats */}
            <div className="flex gap-4 text-sm text-zinc-600">
              <span>👁️ {research.views_count + 1} views</span>
              <span>💬 {research.discussions_count} discussions</span>
              <span>📎 {research.citations_count} citations</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 capitalize">
              {research.object_type.replace(/_/g, ' ')}
            </span>
            {research.lab_type !== 'none' && (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800 capitalize">
                {research.lab_type} Lab
              </span>
            )}
            {research.topics?.map((topic: string) => (
              <span
                key={topic}
                className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700"
              >
                {topic}
              </span>
            ))}
          </div>

          {/* Published Date & Actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Published {new Date(research.published_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <ResearchActions researchObjectId={research.id} researchTitle={research.title} />
          </div>
        </div>

        {/* Abstract */}
        <div className="mb-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">Abstract</h2>
          <p className="text-zinc-700 leading-relaxed">{research.abstract}</p>
        </div>

        {/* Fork Workspace Button */}
        {workspace && (
          <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900">Replicate this Analysis</h3>
                <p className="mb-3 text-sm text-zinc-700">
                  This research includes a replicable {workspace.lab_type} lab workspace. Fork it to explore the data and methods yourself.
                </p>
              </div>
              <ForkWorkspaceButton
                workspaceId={workspace.id}
                workspaceName={workspace.name}
                labType={workspace.lab_type}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900">Content</h2>
          <div className="prose prose-zinc max-w-none">
            {research.content?.sections?.map((section: any, index: number) => {
              if (section.type === 'text') {
                return (
                  <div key={index} className="mb-4 whitespace-pre-wrap text-zinc-700">
                    {section.content}
                  </div>
                );
              }
              if (section.type === 'chart') {
                return (
                  <div key={index} className="mb-4 rounded-lg border border-zinc-200 p-4">
                    <p className="text-sm text-zinc-500">📊 Chart: {section.title}</p>
                  </div>
                );
              }
              if (section.type === 'table') {
                return (
                  <div key={index} className="mb-4 rounded-lg border border-zinc-200 p-4">
                    <p className="text-sm text-zinc-500">📋 Table: {section.title}</p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>

        {/* Methods & Assumptions */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <h3 className="mb-3 text-lg font-semibold text-zinc-900">Methods</h3>
            <p className="text-zinc-700 whitespace-pre-wrap">{research.methods}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <h3 className="mb-3 text-lg font-semibold text-zinc-900">Assumptions</h3>
            <p className="text-zinc-700 whitespace-pre-wrap">{research.assumptions}</p>
          </div>
        </div>

        {/* Data Sources & Techniques */}
        {(research.data_sources?.length > 0 || research.statistical_techniques?.length > 0) && (
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            {research.data_sources?.length > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h3 className="mb-3 text-lg font-semibold text-zinc-900">Data Sources</h3>
                <ul className="list-disc list-inside space-y-1 text-zinc-700">
                  {research.data_sources.map((source: string, i: number) => (
                    <li key={i}>{source}</li>
                  ))}
                </ul>
              </div>
            )}
            {research.statistical_techniques?.length > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h3 className="mb-3 text-lg font-semibold text-zinc-900">Statistical Techniques</h3>
                <ul className="list-disc list-inside space-y-1 text-zinc-700">
                  {research.statistical_techniques.map((technique: string, i: number) => (
                    <li key={i}>{technique}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Findings */}
        {research.content?.findings?.length > 0 && (
          <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
            <h3 className="mb-3 text-lg font-semibold text-zinc-900">Key Findings</h3>
            <ul className="list-disc list-inside space-y-2 text-zinc-700">
              {research.content.findings.map((finding: string, i: number) => (
                <li key={i}>{finding}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Citations Section */}
        <div className="mt-12">
          <CitationsSection
            researchObjectId={research.id}
            isAuthor={currentUserProfile?.id === research.author.id}
          />
        </div>

        {/* Discussions Section */}
        <div className="mt-12 border-t border-zinc-200 pt-8">
          <ResearchViewClient
            researchId={research.id}
            researchSlug={research.slug}
            currentUserProfile={currentUserProfile}
          />
        </div>
      </div>
    </main>
  );
}
