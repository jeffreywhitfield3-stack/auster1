"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

type WeeklyBrief = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  week_start_date: string;
  week_end_date: string;
  published_at: string;
  author_name: string;
  trade_ideas: any[];
  economic_events: any[];
  page_views: number;
};

export default function BriefViewClient({ slug }: { slug: string }) {
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrief = async () => {
      try {
        const response = await fetch(`/api/briefs/${slug}`);
        if (!response.ok) {
          throw new Error("Brief not found");
        }
        const data = await response.json();
        setBrief(data.brief);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load brief");
      } finally {
        setLoading(false);
      }
    };

    fetchBrief();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-zinc-600">Loading brief...</p>
        </div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Brief Not Found
          </h1>
          <p className="mb-6 text-zinc-600">{error || "This brief does not exist"}</p>
          <Link
            href="/research/briefs"
            className="text-blue-600 hover:underline"
          >
            ← Back to all briefs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/research/briefs"
          className="mb-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← Back to all briefs
        </Link>

        <h1 className="mb-4 text-4xl font-bold text-zinc-900">{brief.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
          <span>By {brief.author_name}</span>
          <span>•</span>
          <span>
            Week of{" "}
            {new Date(brief.week_start_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            -{" "}
            {new Date(brief.week_end_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span>•</span>
          <span>
            Published{" "}
            {new Date(brief.published_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        <p className="mt-4 text-lg text-zinc-700">{brief.summary}</p>
      </div>

      {/* Trade Ideas */}
      {brief.trade_ideas && brief.trade_ideas.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900">
            🎯 Top Trade Ideas
          </h2>
          <div className="space-y-4">
            {brief.trade_ideas.map((trade: any, index: number) => (
              <div
                key={index}
                className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-zinc-900">
                    {trade.symbol} - {trade.strategy_type}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      trade.direction === "bullish"
                        ? "bg-green-100 text-green-800"
                        : trade.direction === "bearish"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {trade.direction?.toUpperCase()}
                  </span>
                </div>

                {trade.expiration_date && (
                  <p className="mb-3 text-sm text-zinc-600">
                    Expires:{" "}
                    {new Date(trade.expiration_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}

                <p className="mb-4 text-zinc-700">{trade.thesis}</p>

                {(trade.max_profit || trade.max_loss) && (
                  <div className="grid grid-cols-2 gap-4 border-t border-blue-200 pt-4">
                    {trade.max_profit && (
                      <div>
                        <p className="text-xs uppercase text-zinc-600">Max Profit</p>
                        <p className="text-xl font-bold text-green-600">
                          ${trade.max_profit.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {trade.max_loss && (
                      <div>
                        <p className="text-xs uppercase text-zinc-600">Max Loss</p>
                        <p className="text-xl font-bold text-red-600">
                          ${trade.max_loss.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {trade.probability_of_profit && (
                  <div className="mt-3 border-t border-blue-200 pt-3">
                    <p className="text-sm text-zinc-600">
                      Probability of Profit:{" "}
                      <span className="font-semibold text-zinc-900">
                        {trade.probability_of_profit.toFixed(1)}%
                      </span>
                    </p>
                  </div>
                )}

                <Link
                  href={`/derivatives?symbol=${trade.symbol}`}
                  className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Analyze {trade.symbol} in Derivatives Lab →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Economic Events */}
      {brief.economic_events && brief.economic_events.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900">
            📅 Key Events This Week
          </h2>
          <div className="space-y-4">
            {brief.economic_events.map((event: any, index: number) => (
              <div
                key={index}
                className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-xl font-semibold text-zinc-900">
                    {event.name}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      event.importance === "critical"
                        ? "bg-red-100 text-red-800"
                        : event.importance === "high"
                          ? "bg-orange-100 text-orange-800"
                          : event.importance === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {event.importance?.toUpperCase()}
                  </span>
                </div>

                <p className="mb-3 text-sm text-zinc-600">
                  {new Date(event.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                <p className="text-zinc-700">{event.impact}</p>

                {event.symbols && event.symbols.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.symbols.map((symbol: string) => (
                      <Link
                        key={symbol}
                        href={`/derivatives?symbol=${symbol}`}
                        className="rounded bg-white px-3 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-100"
                      >
                        {symbol}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="prose prose-lg prose-zinc mb-8 max-w-none">
        <ReactMarkdown>{brief.content}</ReactMarkdown>
      </div>

      {/* Footer CTA */}
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-8 text-center">
        <h3 className="mb-2 text-2xl font-bold text-zinc-900">
          Ready to Trade These Ideas?
        </h3>
        <p className="mb-6 text-zinc-700">
          Use our Derivatives Lab to analyze these trades with live Greeks, risk
          graphs, and backtesting before entering positions.
        </p>
        <Link
          href="/derivatives"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Open Derivatives Lab →
        </Link>
      </div>
    </div>
  );
}
