"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "d3-format";

type Observation = {
  date: string;
  value: number | null;
};

type SeriesMeta = {
  id: string;
  title: string;
  units: string;
  frequency: string;
  seasonal_adjustment?: string;
  last_updated?: string;
};

type FREDResponse = {
  id: string;
  meta: SeriesMeta | null;
  observations: Observation[];
};

const macroSeries = [
  {
    id: "GDPC1",
    name: "Real GDP",
    description: "Real Gross Domestic Product",
    color: "#10b981",
    defaultStart: "2010-01-01",
  },
  {
    id: "UNRATE",
    name: "Unemployment Rate",
    description: "Civilian Unemployment Rate",
    color: "#ef4444",
    defaultStart: "2010-01-01",
  },
  {
    id: "CPIAUCSL",
    name: "CPI",
    description: "Consumer Price Index for All Urban Consumers",
    color: "#f59e0b",
    defaultStart: "2010-01-01",
  },
  {
    id: "FEDFUNDS",
    name: "Federal Funds Rate",
    description: "Effective Federal Funds Rate",
    color: "#3b82f6",
    defaultStart: "2010-01-01",
  },
  {
    id: "DGS10",
    name: "10-Year Treasury",
    description: "10-Year Treasury Constant Maturity Rate",
    color: "#8b5cf6",
    defaultStart: "2010-01-01",
  },
];

export default function MacroClient() {
  const [selectedSeries, setSelectedSeries] = useState(macroSeries[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FREDResponse | null>(null);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function fetchData(seriesId: string, start: string) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/econ/fred/observations?id=${encodeURIComponent(seriesId)}&start=${encodeURIComponent(start)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "unknown" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(selectedSeries.id, selectedSeries.defaultStart);
  }, [selectedSeries]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.observations
      .filter((obs) => obs.value !== null)
      .map((obs) => ({
        date: obs.date,
        value: obs.value,
        displayDate: formatDate(obs.date),
      }));
  }, [data]);

  const latestValue = useMemo(() => {
    if (!chartData.length) return null;
    return chartData[chartData.length - 1].value;
  }, [chartData]);

  const growthRate = useMemo(() => {
    if (chartData.length < 2) return null;
    const latest = chartData[chartData.length - 1].value;
    const yearAgo = chartData[Math.max(0, chartData.length - 5)]?.value; // Approximate year ago (4-5 obs)
    if (!latest || !yearAgo) return null;
    return ((latest - yearAgo) / yearAgo) * 100;
  }, [chartData]);

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  }

  function formatValue(value: number): string {
    if (selectedSeries.id === "GDPC1") {
      return `$${(value / 1000).toFixed(1)}T`;
    }
    if (selectedSeries.id === "CPIAUCSL") {
      return value.toFixed(1);
    }
    return value.toFixed(2);
  }

  async function saveWorkspace() {
    setSavingWorkspace(true);
    try {
      const workspaceState = {
        selectedSeriesId: selectedSeries.id,
        selectedSeriesName: selectedSeries.name,
        data,
        chartData,
      };

      const response = await fetch('/api/workspaces/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Macro: ${selectedSeries.name} - ${new Date().toLocaleDateString()}`,
          description: `Macro research analysis for ${selectedSeries.description}`,
          product: 'econ',
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

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Link
              href="/products/econ"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              ← Back to Econ Lab
            </Link>
            <h1 className="mt-4 text-4xl font-bold text-zinc-900 sm:text-5xl">
              🏛 Macro Research Lab
            </h1>
            <p className="mt-4 text-lg leading-7 text-zinc-600">
              System-level economic behavior. Track GDP, inflation, unemployment, and monetary policy indicators.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveWorkspace}
              disabled={savingWorkspace}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
            >
              <span>💾</span>
              <span>{savingWorkspace ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save Analysis'}</span>
            </button>

            <Link
              href="/research/publish?from=econ-macro"
              className="flex items-center gap-2 rounded-lg border-2 border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:border-blue-700 hover:bg-blue-700"
            >
              <span>🏛</span>
              <span>Publish to Research Stage</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Series Selection */}
      <section className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="mb-4 text-lg font-bold text-emerald-900">Select Economic Indicator</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {macroSeries.map((series) => (
            <button
              key={series.id}
              onClick={() => setSelectedSeries(series)}
              className={`rounded-lg border p-4 text-left transition-all ${
                selectedSeries.id === series.id
                  ? "border-emerald-600 bg-white shadow-md"
                  : "border-emerald-300 bg-white hover:border-emerald-400"
              }`}
            >
              <div className="font-semibold text-emerald-900">{series.name}</div>
              <div className="mt-1 text-xs text-zinc-600">{series.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
            <span className="text-sm font-semibold text-emerald-900">Loading FRED data...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-red-900">Error loading data</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => fetchData(selectedSeries.id, selectedSeries.defaultStart)}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Data Display */}
      {data && (
        <>
          {/* Key Metrics */}
          <section className="mb-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Latest Value</div>
              <div className="mt-2 text-3xl font-bold text-zinc-900">
                {latestValue !== null ? formatValue(latestValue) : "—"}
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                {chartData.length > 0 ? chartData[chartData.length - 1].displayDate : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Year-over-Year Change</div>
              <div className={`mt-2 text-3xl font-bold ${growthRate !== null && growthRate < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {growthRate !== null ? `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(2)}%` : "—"}
              </div>
              <p className="mt-2 text-xs text-zinc-600">Approximate annual change</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Data Points</div>
              <div className="mt-2 text-3xl font-bold text-zinc-900">{chartData.length}</div>
              <p className="mt-2 text-xs text-zinc-600">
                Since {chartData.length > 0 ? chartData[0].displayDate : "—"}
              </p>
            </div>
          </section>

          {/* Time Series Chart */}
          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">{data.meta?.title || selectedSeries.name}</h2>
                {data.meta && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                    <span>
                      <strong>Units:</strong> {data.meta.units}
                    </span>
                    <span>
                      <strong>Frequency:</strong> {data.meta.frequency}
                    </span>
                    {data.meta.seasonal_adjustment && (
                      <span>
                        <strong>Adjustment:</strong> {data.meta.seasonal_adjustment}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tickFormatter={formatValue} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px" }}
                    formatter={(value: number | undefined) => [formatValue(value ?? 0), selectedSeries.name]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={selectedSeries.color}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Series Information */}
          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">About This Indicator</h2>
            <div className="space-y-3 text-sm text-zinc-700">
              {selectedSeries.id === "GDPC1" && (
                <>
                  <p>
                    <strong>Real GDP</strong> measures the total value of all goods and services produced in the
                    economy, adjusted for inflation. It's the primary indicator of economic growth.
                  </p>
                  <p>
                    GDP is reported quarterly and typically grows 2-3% annually in healthy economies. Negative growth
                    for two consecutive quarters is often defined as a recession.
                  </p>
                </>
              )}
              {selectedSeries.id === "UNRATE" && (
                <>
                  <p>
                    <strong>Unemployment Rate</strong> represents the percentage of the labor force that is jobless and
                    actively seeking employment.
                  </p>
                  <p>
                    Low unemployment (below 5%) is generally considered healthy. Very low rates may indicate labor
                    shortages and wage pressures.
                  </p>
                </>
              )}
              {selectedSeries.id === "CPIAUCSL" && (
                <>
                  <p>
                    <strong>Consumer Price Index (CPI)</strong> measures the average change over time in prices paid by
                    consumers for a basket of goods and services.
                  </p>
                  <p>
                    CPI is the most widely used measure of inflation. The Federal Reserve targets 2% annual inflation
                    as optimal for economic stability.
                  </p>
                </>
              )}
              {selectedSeries.id === "FEDFUNDS" && (
                <>
                  <p>
                    <strong>Federal Funds Rate</strong> is the interest rate at which banks lend reserve balances to
                    other banks overnight.
                  </p>
                  <p>
                    This is the Federal Reserve's primary monetary policy tool. Higher rates slow economic activity and
                    reduce inflation; lower rates stimulate growth.
                  </p>
                </>
              )}
              {selectedSeries.id === "DGS10" && (
                <>
                  <p>
                    <strong>10-Year Treasury Yield</strong> represents the return on investment for US government debt
                    with a 10-year maturity.
                  </p>
                  <p>
                    This benchmark rate influences mortgage rates, corporate borrowing costs, and serves as an indicator
                    of investor confidence in the economy.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Data Source */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">Data Source</h2>
            <div className="space-y-2 text-sm text-zinc-700">
              <p>
                <strong>Source:</strong> Federal Reserve Economic Data (FRED), Federal Reserve Bank of St. Louis
              </p>
              <p>
                <strong>Series ID:</strong> <code className="rounded bg-zinc-100 px-2 py-1 font-mono">{data.id}</code>
              </p>
              {data.meta?.last_updated && (
                <p>
                  <strong>Last Updated:</strong> {new Date(data.meta.last_updated).toLocaleDateString()}
                </p>
              )}
              <p className="mt-4 text-xs text-zinc-600">
                All data is sourced from FRED API and is subject to revisions by the original data providers (BEA, BLS,
                Federal Reserve, etc.).
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
