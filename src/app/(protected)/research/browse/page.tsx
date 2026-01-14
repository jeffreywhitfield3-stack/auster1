"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ResearchObject = {
  id: string;
  title: string;
  slug: string;
  abstract: string;
  object_type: string;
  topics: string[];
  published_at: string;
  views_count: number;
  discussions_count: number;
  citations_count: number;
  author: {
    display_name: string;
    slug: string;
    avatar_url: string | null;
    tier: string;
  };
};

export default function BrowseResearchPage() {
  const [research, setResearch] = useState<ResearchObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResearch() {
      try {
        const url = filter
          ? `/api/research/list?type=${filter}`
          : '/api/research/list';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch research");
        }
        const data = await response.json();
        setResearch(data.research_objects || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load research");
      } finally {
        setLoading(false);
      }
    }
    fetchResearch();
  }, [filter]);

  const types = [
    { value: null, label: "All Research" },
    { value: "economic_research", label: "Economic Research" },
    { value: "market_analysis", label: "Market Analysis" },
    { value: "econometric_analysis", label: "Econometric Analysis" },
    { value: "data_exploration", label: "Data Exploration" },
    { value: "methodology", label: "Methodology" },
    { value: "replication", label: "Replication" }
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
              Browse Research
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600">
              Explore published economic research and market analysis from the Auster community.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {types.map((type) => (
              <button
                key={type.value || 'all'}
                onClick={() => setFilter(type.value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  filter === type.value
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          {loading && (
            <div className="text-center text-zinc-600">Loading research...</div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-900">
              {error}
            </div>
          )}

          {!loading && !error && research.length === 0 && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-zinc-900">No published research yet</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Be the first to publish your research and share insights with the community.
              </p>
              <div className="mt-6">
                <Link
                  href="/research/publish"
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-zinc-800"
                >
                  Publish your research →
                </Link>
              </div>
            </div>
          )}

          {!loading && !error && research.length > 0 && (
            <div className="grid gap-6">
              {research.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
                      {item.object_type.replace('_', ' ')}
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-500">
                      <span>👁️ {item.views_count}</span>
                      <span>💬 {item.discussions_count}</span>
                      <span>📎 {item.citations_count}</span>
                    </div>
                  </div>

                  <Link href={`/research/${item.slug}`} className="group block">
                    <h3 className="mb-2 text-xl font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                  </Link>

                  <p className="mb-4 text-sm leading-relaxed text-zinc-600">
                    {item.abstract}
                  </p>

                  {item.topics && item.topics.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {item.topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600">
                        {item.author.display_name[0]}
                      </div>
                      <span className="font-semibold">{item.author.display_name}</span>
                      <span className="text-zinc-500">• {item.author.tier}</span>
                    </div>

                    <span className="text-xs text-zinc-500">
                      {new Date(item.published_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA to publish */}
          {!loading && !error && research.length > 0 && (
            <div className="mt-16 rounded-2xl border-2 border-zinc-300 bg-zinc-50 p-8 text-center">
              <h2 className="text-2xl font-bold text-zinc-900">
                Share your research
              </h2>
              <p className="mt-3 text-base text-zinc-600">
                Have insights to share? Publish your economic analysis and market research.
              </p>
              <div className="mt-6">
                <Link
                  href="/research/publish"
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-zinc-800"
                >
                  Publish your research →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
