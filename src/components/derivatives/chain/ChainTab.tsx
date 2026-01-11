"use client";

import { useState, useEffect } from "react";
import QuoteHeader from "./QuoteHeader";
import ExpirationPicker from "./ExpirationPicker";
import ChainTable from "./ChainTable";
import IVSmileChart from "./IVSmileChart";
import type { MassiveChainSnapshot, MassiveOptionLeg } from "@/lib/derivatives/massive";

interface ChainTabProps {
  symbol: string;
  onContractSelect?: (contract: MassiveOptionLeg, type: "call" | "put") => void;
}

export default function ChainTab({ symbol, onContractSelect }: ChainTabProps) {
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(null);
  const [chainData, setChainData] = useState<MassiveChainSnapshot | null>(null);
  const [quoteData, setQuoteData] = useState<{
    price: number;
    change: number;
    changePercent: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [deltaMin, setDeltaMin] = useState(0.25);
  const [deltaMax, setDeltaMax] = useState(0.75);
  const [liquidOnly, setLiquidOnly] = useState(true);
  const [showWeeklies, setShowWeeklies] = useState(true);
  const [showMonthlies, setShowMonthlies] = useState(true);

  // Fetch expirations when symbol changes
  useEffect(() => {
    if (!symbol) return;

    const fetchExpirations = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/derivatives/expirations?symbol=${symbol}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch expirations");
        }

        const data = await response.json();
        setExpirations(data.expirations || []);
      } catch (err: any) {
        setError(err.message);
        setExpirations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExpirations();
  }, [symbol]);

  // Fetch quote data
  useEffect(() => {
    if (!symbol) return;

    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/derivatives/quote?symbol=${symbol}`);

        if (!response.ok) {
          throw new Error("Failed to fetch quote");
        }

        const data = await response.json();
        // Mock change data (in production, you'd fetch this from market data)
        setQuoteData({
          price: data.price || 0,
          change: 0,
          changePercent: 0,
        });
      } catch (err: any) {
        console.error("Failed to fetch quote:", err);
      }
    };

    fetchQuote();
  }, [symbol]);

  // Fetch chain data when expiration changes
  useEffect(() => {
    if (!symbol || !selectedExpiration) return;

    const fetchChain = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/derivatives/chain?symbol=${symbol}&expiration=${selectedExpiration}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch chain");
        }

        const data = await response.json();
        setChainData(data);
      } catch (err: any) {
        setError(err.message);
        setChainData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchChain();
  }, [symbol, selectedExpiration]);

  if (!symbol) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center">
        <p className="text-zinc-600">Please enter a symbol to view the options chain.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quote Header */}
      {quoteData && (
        <QuoteHeader
          symbol={symbol}
          price={quoteData.price}
          change={quoteData.change}
          changePercent={quoteData.changePercent}
          ivRank={undefined} // TODO: Fetch IV rank from API
          nextEarnings={null} // TODO: Fetch earnings from API
          daysToEarnings={null}
        />
      )}

      {/* Expiration Picker */}
      <ExpirationPicker
        expirations={expirations}
        selected={selectedExpiration}
        onSelect={setSelectedExpiration}
        autoSelectDTE={35}
        showWeeklies={showWeeklies}
        showMonthlies={showMonthlies}
      />

      {/* Loading State */}
      {loading && (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-zinc-600">Loading options chain...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="font-semibold text-red-900">Error</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Chain Data */}
      {chainData && !loading && (
        <>
          {/* Filters */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">Filters</h3>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={liquidOnly}
                  onChange={(e) => setLiquidOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Liquid only</span>
              </label>

              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-700">Delta range:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={deltaMin}
                  onChange={(e) => setDeltaMin(parseFloat(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm font-mono text-zinc-600">
                  {deltaMin.toFixed(2)}
                </span>
                <span className="text-zinc-400">to</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={deltaMax}
                  onChange={(e) => setDeltaMax(parseFloat(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm font-mono text-zinc-600">
                  {deltaMax.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Chain Table */}
          <ChainTable
            calls={chainData.calls}
            puts={chainData.puts}
            underlying={chainData.underlying}
            onContractClick={onContractSelect}
            deltaMin={deltaMin}
            deltaMax={deltaMax}
            liquidOnly={liquidOnly}
          />

          {/* IV Smile Chart */}
          <IVSmileChart
            calls={chainData.calls}
            puts={chainData.puts}
            underlying={chainData.underlying}
          />
        </>
      )}
    </div>
  );
}
