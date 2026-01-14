"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PaywallBanner from "@/components/econ/PaywallBanner";
import DisclaimerBanner from "@/components/derivatives/shared/DisclaimerBanner";
import { peekUsage, incrementUsage } from "@/lib/usage-client";

// Tab Components
import ChainTab from "@/components/derivatives/chain/ChainTab";
import BuilderTab from "@/components/derivatives/builder/BuilderTab";
import ScreenersTab from "@/components/derivatives/screeners/ScreenersTab";
import EventsTab from "@/components/derivatives/events/EventsTab";
import MyPositions from "@/components/derivatives/positions/MyPositions";
import BuilderTray from "@/components/derivatives/builder/BuilderTray";
import Watchlist from "@/components/derivatives/shared/Watchlist";
import ModelsTab from "@/components/models/ModelsTab";

type EntMe = { is_paid: boolean; plan: string };

type Tab = "chain" | "builder" | "screeners" | "events" | "positions" | "watchlist" | "models";

type Quote = { symbol: string; price: number | null; asOf?: string | null };
type ExpResp = { symbol: string; expirations: string[] };

async function apiGet<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

export default function DerivativesClient() {
  // ---- Entitlements + Usage ----
  const [ent, setEnt] = useState<EntMe | null>(null);
  const [usage, setUsage] = useState<{
    remainingProduct: number;
    remainingTotal: number;
    allowed: boolean;
  } | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  async function guardUsage(productKey: string, fn: () => Promise<void>) {
    if (ent?.is_paid) {
      await fn();
      return;
    }
    const u = await peekUsage(productKey);
    setUsage({
      remainingProduct: u.remainingProduct,
      remainingTotal: u.remainingTotal,
      allowed: u.allowed,
    });
    if (!u.allowed) {
      setShowPaywall(true);
      return;
    }
    await fn();
    await incrementUsage(productKey);
    const u2 = await peekUsage(productKey);
    setUsage({
      remainingProduct: u2.remainingProduct,
      remainingTotal: u2.remainingTotal,
      allowed: u2.allowed,
    });
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet<EntMe>("/api/entitlements/me");
        setEnt(r);
      } catch {
        setEnt({ is_paid: false, plan: "free" });
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const u = await peekUsage("derivatives_action");
      setUsage({
        remainingProduct: u.remainingProduct,
        remainingTotal: u.remainingTotal,
        allowed: u.allowed,
      });
    })();
  }, []);

  const usageLine = useMemo(() => {
    if (ent?.is_paid) return "Pro: unlimited access";
    if (!usage) return "Free: loading credits…";
    return `Free: ${usage.remainingProduct} Derivatives credits left • ${usage.remainingTotal} sitewide left`;
  }, [ent, usage]);

  // ---- UI State ----
  const [activeTab, setActiveTab] = useState<Tab>("chain");
  const [symbol, setSymbol] = useState("SPY");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Builder Tray State
  const [isTrayExpanded, setIsTrayExpanded] = useState(false);

  // Workspace Save State
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load quote and expirations
  async function loadQuoteAndExpirations() {
    if (!symbol) return;

    setBusy("Loading quote and expirations...");
    setErr(null);

    try {
      const sym = symbol.trim().toUpperCase();

      // Fetch quote
      const q = await apiGet<Quote>(`/api/derivatives/quote?symbol=${encodeURIComponent(sym)}`);
      setQuote(q);

      // Fetch expirations
      const ex = await apiGet<ExpResp>(`/api/derivatives/expirations?symbol=${encodeURIComponent(sym)}`);
      setExpirations(ex.expirations);

      // Auto-select first expiration if none selected
      if (!selectedExpiration && ex.expirations.length > 0) {
        setSelectedExpiration(ex.expirations[0]);
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
      setQuote(null);
      setExpirations([]);
    } finally {
      setBusy(null);
    }
  }

  // Auto-load on mount and symbol change (with usage guard)
  useEffect(() => {
    if (!ent) return;
    guardUsage("derivatives_action", loadQuoteAndExpirations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ent, symbol]);

  // Save workspace function
  async function saveWorkspace() {
    setSavingWorkspace(true);
    try {
      const workspaceState = {
        symbol,
        selectedExpiration,
        activeTab,
        quote,
      };

      const response = await fetch('/api/workspaces/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${symbol} Analysis - ${new Date().toLocaleDateString()}`,
          description: `Derivatives analysis for ${symbol}`,
          product: 'derivatives',
          state: workspaceState,
          is_public: false,
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error('Failed to save workspace');
      }
    } catch (error) {
      console.error('Error saving workspace:', error);
      alert('Failed to save workspace');
    } finally {
      setSavingWorkspace(false);
    }
  }

  const tabs = [
    { id: "chain" as const, name: "Chain", icon: "📊", description: "View options chain" },
    { id: "builder" as const, name: "Builder", icon: "🏗️", description: "Build multi-leg strategies" },
    { id: "screeners" as const, name: "Screeners", icon: "🔍", description: "Find opportunities" },
    { id: "events" as const, name: "Events", icon: "📅", description: "Track earnings" },
    { id: "positions" as const, name: "Positions", icon: "💼", description: "Monitor trades" },
    { id: "watchlist" as const, name: "Watchlist", icon: "⭐", description: "Track symbols" },
    { id: "models" as const, name: "Models", icon: "⚡", description: "Run models" },
  ];

  const currentPrice = quote?.price ?? 0;

  return (
    <main className="mx-auto max-w-7xl p-6 pb-24">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Derivatives Lab</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Options analysis that actually works.
          </p>
          <p className="mt-2 text-xs text-zinc-500">{usageLine}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="h-11 w-32 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            placeholder="SPY"
          />
          <button
            onClick={() => guardUsage("derivatives_action", loadQuoteAndExpirations)}
            disabled={!!busy}
            className="h-11 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy ? "Loading..." : "Refresh"}
          </button>

          <button
            onClick={saveWorkspace}
            disabled={savingWorkspace}
            className="flex h-11 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
          >
            <span>💾</span>
            <span>{savingWorkspace ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save'}</span>
          </button>

          <Link
            href="/research/publish?from=derivatives"
            className="flex h-11 items-center gap-2 rounded-lg border-2 border-blue-600 bg-blue-600 px-4 text-sm font-semibold text-white hover:border-blue-700 hover:bg-blue-700"
          >
            <span>📊</span>
            <span>Publish</span>
          </Link>

          {quote?.price && (
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900">
              {symbol}: ${quote.price.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      <PaywallBanner
        show={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        remainingProduct={usage?.remainingProduct ?? 0}
        remainingTotal={usage?.remainingTotal ?? 0}
        label="Free limit reached"
        message="This action uses a credit. Subscribe for unlimited Derivatives access."
      />

      {/* Disclaimer */}
      <div className="mb-6">
        <DisclaimerBanner />
      </div>

      {err && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
          <div className="font-semibold text-red-900">Error</div>
          <div className="mt-1 text-red-800">{err}</div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group rounded-xl border px-4 py-3 text-left transition-all ${
              activeTab === tab.id
                ? "border-zinc-900 bg-zinc-900 text-white shadow-lg"
                : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{tab.icon}</span>
              <div>
                <div className="font-semibold">{tab.name}</div>
                <div
                  className={`text-xs ${
                    activeTab === tab.id
                      ? "text-zinc-300"
                      : "text-zinc-600 group-hover:text-zinc-700"
                  }`}
                >
                  {tab.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "chain" && <ChainTab symbol={symbol} />}

        {activeTab === "builder" && (
          <BuilderTab
            symbol={symbol}
            currentPrice={currentPrice}
            expiration={selectedExpiration}
          />
        )}

        {activeTab === "screeners" && (
          <ScreenersTab
            symbol={symbol}
            expiration={selectedExpiration}
            expirations={expirations}
            onSymbolChange={setSymbol}
            onSwitchToChain={(newSymbol) => {
              setSymbol(newSymbol);
              setActiveTab("chain");
            }}
          />
        )}

        {activeTab === "events" && (
          <EventsTab
            symbol={symbol}
            onSymbolSelect={(newSymbol) => {
              setSymbol(newSymbol);
              setActiveTab("chain");
            }}
          />
        )}

        {activeTab === "positions" && <MyPositions />}

        {activeTab === "watchlist" && (
          <Watchlist
            onSymbolClick={(sym) => {
              setSymbol(sym);
              setActiveTab("chain");
            }}
          />
        )}

        {activeTab === "models" && <ModelsTab lab="derivatives" />}
      </div>

      {/* Builder Tray (shows on Builder tab) */}
      {activeTab === "builder" && (
        <BuilderTray
          strategy={null}
          isExpanded={isTrayExpanded}
          onToggle={() => setIsTrayExpanded(!isTrayExpanded)}
          onClear={() => {}}
          onSave={() => {}}
        />
      )}

      {/* Quick Navigation Footer */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-zinc-900">Quick Navigation</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => setActiveTab("chain")}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              activeTab === "chain"
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100"
            }`}
          >
            <span className="text-xl">📊</span>
            <div>
              <div className="font-semibold text-zinc-900">Chain</div>
              <div className="text-xs text-zinc-600">View chain and IV</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("builder")}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              activeTab === "builder"
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100"
            }`}
          >
            <span className="text-xl">🏗️</span>
            <div>
              <div className="font-semibold text-zinc-900">Builder</div>
              <div className="text-xs text-zinc-600">Build strategies</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("screeners")}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              activeTab === "screeners"
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100"
            }`}
          >
            <span className="text-xl">🔍</span>
            <div>
              <div className="font-semibold text-zinc-900">Screeners</div>
              <div className="text-xs text-zinc-600">Find opportunities</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("events")}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              activeTab === "events"
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100"
            }`}
          >
            <span className="text-xl">📅</span>
            <div>
              <div className="font-semibold text-zinc-900">Events</div>
              <div className="text-xs text-zinc-600">Track earnings</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("positions")}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              activeTab === "positions"
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100"
            }`}
          >
            <span className="text-xl">💼</span>
            <div>
              <div className="font-semibold text-zinc-900">Positions</div>
              <div className="text-xs text-zinc-600">Monitor trades</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("watchlist")}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              activeTab === "watchlist"
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100"
            }`}
          >
            <span className="text-xl">⭐</span>
            <div>
              <div className="font-semibold text-zinc-900">Watchlist</div>
              <div className="text-xs text-zinc-600">Track symbols</div>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}
