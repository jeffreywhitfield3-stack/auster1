"use client";

import React, { useState } from "react";
import Link from "next/link";
import SubscriptionGate from "@/components/SubscriptionGate";

// Research Stage: Auster's public research institution
// Where economic and financial analyses become permanent public artifacts

export default function ResearchStageClient() {
  const [activeView, setActiveView] = useState<"recent" | "topics" | "researchers">("recent");

  return (
    <SubscriptionGate>
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* Hero Section */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-900">
            Research Institution
          </div>

          {/* Headline */}
          <h1 className="mb-4 text-5xl font-bold leading-tight tracking-tight text-zinc-900 lg:text-6xl">
            The Research Stage
          </h1>

          <p className="mb-8 max-w-3xl text-xl leading-relaxed text-zinc-600">
            A public research commons where economic and financial analyses
            become <span className="font-semibold text-zinc-900">permanent artifacts</span>,
            methods are <span className="font-semibold text-zinc-900">transparent</span>, and
            understanding propagates through{" "}
            <span className="font-semibold text-zinc-900">merit</span>, not marketing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/research/publish"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-blue-600 bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:border-blue-700 hover:bg-blue-700"
            >
              <span>Publish Research</span>
              <span>→</span>
            </Link>
            <Link
              href="/research/browse"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-900 shadow-sm transition-all hover:border-zinc-400"
            >
              Browse Research
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-transparent bg-transparent px-6 py-3 font-semibold text-zinc-600 transition-all hover:text-zinc-900"
            >
              How it Works
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-1">
            {[
              { id: "recent", label: "Recent Research", icon: "📊" },
              { id: "topics", label: "By Topic", icon: "🏷" },
              { id: "researchers", label: "Researchers", icon: "👤" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as typeof activeView)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeView === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {activeView === "recent" && <RecentResearchView />}
        {activeView === "topics" && <TopicsView />}
        {activeView === "researchers" && <ResearchersView />}
      </div>

      {/* Mission Statement */}
      <div className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900">
            Where Serious Analytical Work Lives
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-600">
            This is where economic and financial insight becomes public artifact.
            Where methods are challenged. Where work is extended. Where understanding
            is shared.
          </p>
        </div>
      </div>

      {/* View Content */}
      {activeView === "recent" && <RecentResearchView />}
      {activeView === "topics" && <TopicsView />}
      {activeView === "researchers" && <ResearchersView />}

    </main>
    </SubscriptionGate>
  );
}

// ============================================================================
// VIEW COMPONENTS
// ============================================================================

function RecentResearchView() {
  // Mock data - will be replaced with real API calls
  const mockResearch = [
    {
      id: "1",
      title: "Long-Run Inequality Trends in the United States, 1980-2025",
      author: "Jane Doe",
      authorSlug: "jane-doe",
      abstract: "Analysis of income and wealth concentration over 45 years, examining structural drivers and policy implications.",
      publishedAt: "2026-01-10",
      objectType: "Economic Research",
      topics: ["Inequality", "Income Distribution", "Wealth"],
      discussionsCount: 12,
      citationsCount: 3,
    },
    {
      id: "2",
      title: "Options Market Implied Volatility During Earnings Events",
      author: "John Smith",
      authorSlug: "john-smith",
      abstract: "Empirical study of IV behavior before and after earnings announcements across 5,000+ events.",
      publishedAt: "2026-01-09",
      objectType: "Market Analysis",
      topics: ["Options", "Volatility", "Earnings"],
      discussionsCount: 8,
      citationsCount: 1,
    },
    {
      id: "3",
      title: "Estimating Labor Market Slack: A New Methodology",
      author: "Maria Garcia",
      authorSlug: "maria-garcia",
      abstract: "Alternative approach to measuring unemployment underutilization using BLS microdata.",
      publishedAt: "2026-01-08",
      objectType: "Econometric Analysis",
      topics: ["Labor", "Econometrics", "Methodology"],
      discussionsCount: 15,
      citationsCount: 5,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900">Recently Published</h2>
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <span className="font-semibold">{mockResearch.length}</span>
          <span>research objects published this week</span>
        </div>
      </div>

      <div className="space-y-4">
        {mockResearch.map((research) => (
          <Link
            key={research.id}
            href={`/research/${research.id}`}
            className="group block rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          >
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="mb-2 text-xl font-bold text-zinc-900 group-hover:text-blue-600">
                  {research.title}
                </h3>
                <div className="flex items-center gap-3 text-sm">
                  <Link
                    href={`/researchers/${research.authorSlug}`}
                    className="font-semibold text-zinc-900 hover:text-blue-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {research.author}
                  </Link>
                  <span className="text-zinc-400">·</span>
                  <span className="text-zinc-600">{research.publishedAt}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
                {research.objectType}
              </div>
            </div>

            {/* Abstract */}
            <p className="mb-4 text-sm leading-relaxed text-zinc-600">
              {research.abstract}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {research.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-600">
                <span>💬 {research.discussionsCount} discussions</span>
                <span>📎 {research.citationsCount} citations</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Load More */}
      <div className="pt-8 text-center">
        <button className="rounded-lg border-2 border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-900 shadow-sm transition-all hover:border-zinc-400">
          Load More Research
        </button>
      </div>
    </div>
  );
}

function TopicsView() {
  const topics = [
    {
      name: "Inequality & Distribution",
      slug: "inequality",
      description: "Income, wealth, and opportunity disparity studies",
      count: 24,
      color: "violet",
    },
    {
      name: "Labor Markets",
      slug: "labor",
      description: "Employment, wages, and workforce dynamics",
      count: 18,
      color: "blue",
    },
    {
      name: "Options & Derivatives",
      slug: "derivatives",
      description: "Market microstructure and volatility analysis",
      count: 31,
      color: "amber",
    },
    {
      name: "Macroeconomic Trends",
      slug: "macro",
      description: "GDP, inflation, interest rates, and cycles",
      count: 15,
      color: "emerald",
    },
    {
      name: "Econometric Methods",
      slug: "econometrics",
      description: "Statistical techniques and causal inference",
      count: 12,
      color: "red",
    },
    {
      name: "Market Behavior",
      slug: "markets",
      description: "Price discovery, liquidity, and efficiency",
      count: 22,
      color: "indigo",
    },
  ];

  const colorMap: Record<string, string> = {
    violet: "border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-300",
    blue: "border-blue-200 bg-blue-50 text-blue-900 hover:border-blue-300",
    amber: "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300",
    red: "border-red-200 bg-red-50 text-red-900 hover:border-red-300",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900 hover:border-indigo-300",
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Browse by Topic</h2>
        <p className="text-zinc-600">Explore research organized by analytical domain</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <Link
            key={topic.slug}
            href={`/research/topics/${topic.slug}`}
            className={`group block rounded-xl border-2 p-6 transition-all ${colorMap[topic.color]}`}
          >
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-lg font-bold">{topic.name}</h3>
              <div className="rounded-full bg-white/50 px-3 py-1 text-sm font-bold">
                {topic.count}
              </div>
            </div>
            <p className="text-sm opacity-90">{topic.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ResearchersView() {
  const researchers = [
    {
      name: "Jane Doe",
      slug: "jane-doe",
      credentials: "PhD Economics, MIT",
      tier: "Researcher",
      publishedCount: 8,
      attributionScore: 24,
      recentWork: "Long-run inequality trends",
    },
    {
      name: "John Smith",
      slug: "john-smith",
      credentials: "Independent Researcher",
      tier: "Contributor",
      publishedCount: 3,
      attributionScore: 7,
      recentWork: "Options IV during earnings",
    },
    {
      name: "Maria Garcia",
      slug: "maria-garcia",
      credentials: "Senior Economist",
      tier: "Researcher",
      publishedCount: 12,
      attributionScore: 45,
      recentWork: "Labor market slack methodology",
    },
  ];

  const tierColors: Record<string, string> = {
    Observer: "bg-zinc-100 text-zinc-700",
    Contributor: "bg-blue-100 text-blue-700",
    Researcher: "bg-violet-100 text-violet-700",
    Institution: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Active Researchers</h2>
        <p className="text-zinc-600">Contributors to the public research commons</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {researchers.map((researcher) => (
          <Link
            key={researcher.slug}
            href={`/researchers/${researcher.slug}`}
            className="group block rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          >
            {/* Name & Tier */}
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-lg font-bold text-zinc-900 group-hover:text-blue-600">
                {researcher.name}
              </h3>
              <span
                className={`rounded-full px-2 py-1 text-xs font-bold ${tierColors[researcher.tier]}`}
              >
                {researcher.tier}
              </span>
            </div>

            {/* Credentials */}
            <p className="mb-4 text-sm text-zinc-600">{researcher.credentials}</p>

            {/* Stats */}
            <div className="mb-3 flex gap-4 text-xs text-zinc-600">
              <div>
                <span className="font-semibold text-zinc-900">
                  {researcher.publishedCount}
                </span>{" "}
                published
              </div>
              <div>
                <span className="font-semibold text-zinc-900">
                  {researcher.attributionScore}
                </span>{" "}
                attributions
              </div>
            </div>

            {/* Recent Work */}
            <p className="text-xs text-zinc-500">
              Recent: <span className="text-zinc-700">{researcher.recentWork}</span>
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
