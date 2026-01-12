"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase-browser";

type TradeIdea = {
  symbol: string;
  strategy_type: string;
  direction: string;
  expiration_date: string;
  strikes: number[];
  thesis: string;
  catalysts: string[];
  risk_factors: string[];
  max_profit?: number;
  max_loss?: number;
  break_even?: number[];
  probability_of_profit?: number;
};

type EconomicEvent = {
  name: string;
  type: string;
  date: string;
  importance: string;
  impact: string;
  symbols: string[];
};

export default function AdminBriefsClient() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [tradeIdeas, setTradeIdeas] = useState<TradeIdea[]>([]);
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([]);
  const [weekStartDate, setWeekStartDate] = useState("");
  const [weekEndDate, setWeekEndDate] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    message: string;
    emailsSent?: number;
    totalSubscribers?: number;
  } | null>(null);

  // State for adding trade ideas
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [newTrade, setNewTrade] = useState<Partial<TradeIdea>>({
    symbol: "",
    strategy_type: "iron_condor",
    direction: "neutral",
    expiration_date: "",
    strikes: [],
    thesis: "",
    catalysts: [],
    risk_factors: [],
  });

  // State for adding economic events
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<EconomicEvent>>({
    name: "",
    type: "earnings",
    date: "",
    importance: "medium",
    impact: "",
    symbols: [],
  });

  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAdmin(user?.email === "jeffreywhitfield3@gmail.com");
    };
    checkAdmin();
  }, []);

  // Set default week dates (current week)
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    setWeekStartDate(startOfWeek.toISOString().split("T")[0]);
    setWeekEndDate(endOfWeek.toISOString().split("T")[0]);
  }, []);

  const addTradeIdea = () => {
    if (!newTrade.symbol || !newTrade.thesis) {
      alert("Please fill in symbol and thesis");
      return;
    }

    setTradeIdeas([...tradeIdeas, newTrade as TradeIdea]);
    setNewTrade({
      symbol: "",
      strategy_type: "iron_condor",
      direction: "neutral",
      expiration_date: "",
      strikes: [],
      thesis: "",
      catalysts: [],
      risk_factors: [],
    });
    setShowTradeForm(false);
  };

  const removeTradeIdea = (index: number) => {
    setTradeIdeas(tradeIdeas.filter((_, i) => i !== index));
  };

  const addEconomicEvent = () => {
    if (!newEvent.name || !newEvent.date || !newEvent.impact) {
      alert("Please fill in event name, date, and impact");
      return;
    }

    setEconomicEvents([...economicEvents, newEvent as EconomicEvent]);
    setNewEvent({
      name: "",
      type: "earnings",
      date: "",
      importance: "medium",
      impact: "",
      symbols: [],
    });
    setShowEventForm(false);
  };

  const removeEconomicEvent = (index: number) => {
    setEconomicEvents(economicEvents.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!title || !summary || !content) {
      alert("Please fill in title, summary, and content");
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const response = await fetch("/api/briefs/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          content,
          tradeIdeas,
          economicEvents,
          weekStartDate,
          weekEndDate,
          sendEmail,
          generationMethod: "manual",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish brief");
      }

      setPublishResult({
        success: true,
        message: data.message,
        emailsSent: data.emailsSent,
        totalSubscribers: data.totalSubscribers,
      });

      // Reset form
      setTitle("");
      setSummary("");
      setContent("");
      setTradeIdeas([]);
      setEconomicEvents([]);
    } catch (error) {
      setPublishResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-4 text-zinc-600">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-4">
        <Link
          href="/app/admin/blog"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Admin Dashboard
        </Link>
      </div>

      <h1 className="mb-8 text-3xl font-bold text-zinc-900">
        Compose Weekly Brief
      </h1>

      {publishResult && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            publishResult.success
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-semibold">{publishResult.message}</p>
          {publishResult.emailsSent !== undefined && (
            <p className="mt-2 text-sm">
              Sent {publishResult.emailsSent} of {publishResult.totalSubscribers}{" "}
              emails successfully
            </p>
          )}
        </div>
      )}

      {/* Basic Information */}
      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Basic Information
        </h2>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Market Volatility Surge: Top Trades for This Week"
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Summary (Email Preview - Max 300 chars)
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Short summary that will appear in the email..."
            rows={3}
            maxLength={300}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-500">
            {summary.length}/300 characters
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Week Start Date
            </label>
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Week End Date
            </label>
            <input
              type="date"
              value={weekEndDate}
              onChange={(e) => setWeekEndDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Full Content */}
      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Full Content (for website)
        </h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Full analysis content... Use markdown for formatting."
          rows={12}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-2 text-xs text-zinc-500">
          Supports Markdown formatting. This is the full content that will appear on
          the website.
        </p>
      </div>

      {/* Trade Ideas */}
      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">
            Trade Ideas ({tradeIdeas.length})
          </h2>
          <button
            onClick={() => setShowTradeForm(!showTradeForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {showTradeForm ? "Cancel" : "+ Add Trade Idea"}
          </button>
        </div>

        {showTradeForm && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Symbol
                </label>
                <input
                  type="text"
                  value={newTrade.symbol}
                  onChange={(e) =>
                    setNewTrade({ ...newTrade, symbol: e.target.value.toUpperCase() })
                  }
                  placeholder="SPY"
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Strategy Type
                </label>
                <select
                  value={newTrade.strategy_type}
                  onChange={(e) =>
                    setNewTrade({ ...newTrade, strategy_type: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="iron_condor">Iron Condor</option>
                  <option value="call_spread">Call Spread</option>
                  <option value="put_spread">Put Spread</option>
                  <option value="protective_put">Protective Put</option>
                  <option value="covered_call">Covered Call</option>
                  <option value="straddle">Straddle</option>
                  <option value="strangle">Strangle</option>
                </select>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Direction
                </label>
                <select
                  value={newTrade.direction}
                  onChange={(e) =>
                    setNewTrade({ ...newTrade, direction: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="bullish">Bullish</option>
                  <option value="bearish">Bearish</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={newTrade.expiration_date}
                  onChange={(e) =>
                    setNewTrade({ ...newTrade, expiration_date: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Thesis (Why this trade?)
              </label>
              <textarea
                value={newTrade.thesis}
                onChange={(e) => setNewTrade({ ...newTrade, thesis: e.target.value })}
                placeholder="High IV rank, expecting mean reversion..."
                rows={3}
                className="w-full rounded border px-3 py-2"
              />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Max Profit ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTrade.max_profit || ""}
                  onChange={(e) =>
                    setNewTrade({
                      ...newTrade,
                      max_profit: parseFloat(e.target.value),
                    })
                  }
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Max Loss ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTrade.max_loss || ""}
                  onChange={(e) =>
                    setNewTrade({ ...newTrade, max_loss: parseFloat(e.target.value) })
                  }
                  className="w-full rounded border px-3 py-2"
                />
              </div>
            </div>

            <button
              onClick={addTradeIdea}
              className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Add Trade Idea
            </button>
          </div>
        )}

        <div className="space-y-4">
          {tradeIdeas.map((trade, index) => (
            <div
              key={index}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">
                    {trade.symbol} - {trade.strategy_type}
                  </h3>
                  <p className="text-sm text-zinc-600">
                    {trade.direction} • Expires {trade.expiration_date}
                  </p>
                </div>
                <button
                  onClick={() => removeTradeIdea(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
              <p className="text-sm text-zinc-700">{trade.thesis}</p>
              {trade.max_profit && trade.max_loss && (
                <div className="mt-2 flex gap-4 text-sm">
                  <span className="text-green-600">
                    Max Profit: ${trade.max_profit.toFixed(2)}
                  </span>
                  <span className="text-red-600">
                    Max Loss: ${trade.max_loss.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Economic Events */}
      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">
            Economic Events ({economicEvents.length})
          </h2>
          <button
            onClick={() => setShowEventForm(!showEventForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {showEventForm ? "Cancel" : "+ Add Event"}
          </button>
        </div>

        {showEventForm && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Event Name
                </label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  placeholder="Federal Reserve FOMC Meeting"
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Event Type
                </label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="earnings">Earnings</option>
                  <option value="fed_meeting">Fed Meeting</option>
                  <option value="cpi">CPI Release</option>
                  <option value="jobs_report">Jobs Report</option>
                  <option value="gdp">GDP Release</option>
                  <option value="pce">PCE Release</option>
                </select>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Date
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Importance
                </label>
                <select
                  value={newEvent.importance}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, importance: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Expected Impact
              </label>
              <textarea
                value={newEvent.impact}
                onChange={(e) => setNewEvent({ ...newEvent, impact: e.target.value })}
                placeholder="Major market volatility expected. Watch SPY, TLT..."
                rows={2}
                className="w-full rounded border px-3 py-2"
              />
            </div>

            <button
              onClick={addEconomicEvent}
              className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Add Event
            </button>
          </div>
        )}

        <div className="space-y-4">
          {economicEvents.map((event, index) => (
            <div
              key={index}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">{event.name}</h3>
                  <p className="text-sm text-zinc-600">
                    {event.type} •{" "}
                    {new Date(event.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    • {event.importance.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => removeEconomicEvent(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
              <p className="text-sm text-zinc-700">{event.impact}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Publish Options */}
      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Publish Options
        </h2>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-zinc-700">
            Send email to all subscribers immediately
          </span>
        </label>

        <p className="mt-4 text-sm text-zinc-600">
          {sendEmail
            ? "Brief will be published and emails will be sent to all active weekly brief subscribers."
            : "Brief will be published to the website only (no emails sent)."}
        </p>
      </div>

      {/* Publish Button */}
      <button
        onClick={handlePublish}
        disabled={isPublishing || !title || !summary || !content}
        className="w-full rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {isPublishing ? "Publishing..." : "Publish Brief"}
      </button>
    </div>
  );
}
