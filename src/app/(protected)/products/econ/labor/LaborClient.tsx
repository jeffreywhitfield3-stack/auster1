"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Observation = {
  date: string;
  year: string;
  period: string;
  periodName: string;
  value: number | null;
};

type BLSResponse = {
  seriesId: string;
  observations: Observation[];
  meta: {
    startYear: string;
    endYear: string;
    dataPoints: number;
  };
};

const laborSeries = [
  {
    id: "LNS14000000",
    name: "Unemployment Rate",
    description: "Civilian Unemployment Rate (%)",
    color: "#ef4444",
  },
  {
    id: "LNS11300000",
    name: "Labor Force Participation",
    description: "Labor Force Participation Rate (%)",
    color: "#3b82f6",
  },
  {
    id: "CES0500000003",
    name: "Average Hourly Earnings",
    description: "Average Hourly Earnings ($)",
    color: "#10b981",
  },
  {
    id: "CES3000000001",
    name: "Manufacturing Jobs",
    description: "Manufacturing Employment (thousands)",
    color: "#f59e0b",
  },
];

export default function LaborClient() {
  const [selectedSeries, setSelectedSeries] = useState(laborSeries[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BLSResponse | null>(null);

  async function fetchData(seriesId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/econ/bls/series?series_id=${encodeURIComponent(seriesId)}`);
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
    fetchData(selectedSeries.id);
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

  const yearChange = useMemo(() => {
    if (chartData.length < 13) return null; // Need at least 13 months
    const latest = chartData[chartData.length - 1].value;
    const yearAgo = chartData[chartData.length - 13]?.value;
    if (!latest || !yearAgo) return null;
    return latest - yearAgo;
  }, [chartData]);

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  }

  function formatValue(value: number | null): string {
    if (value === null) return "—";
    if (selectedSeries.id === "CES0500000003") {
      return `$${value.toFixed(2)}`;
    }
    if (selectedSeries.id.startsWith("CES")) {
      return `${(value / 1000).toFixed(1)}M`;
    }
    return `${value.toFixed(1)}%`;
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/products/econ"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to Econ Lab
        </Link>
        <h1 className="mt-4 text-4xl font-bold text-zinc-900 sm:text-5xl">
          💼 Labor Market Lab
        </h1>
        <p className="mt-4 text-lg leading-7 text-zinc-600">
          Employment trends, wage growth, and labor force dynamics from the Bureau of Labor Statistics.
        </p>
      </div>

      {/* Series Selection */}
      <section className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="mb-4 text-lg font-bold text-blue-900">Select Labor Market Indicator</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {laborSeries.map((series) => (
            <button
              key={series.id}
              onClick={() => setSelectedSeries(series)}
              className={`rounded-lg border p-4 text-left transition-all ${
                selectedSeries.id === series.id
                  ? "border-blue-600 bg-white shadow-md"
                  : "border-blue-300 bg-white hover:border-blue-400"
              }`}
            >
              <div className="font-semibold text-blue-900">{series.name}</div>
              <div className="mt-1 text-xs text-zinc-600">{series.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm font-semibold text-blue-900">Loading BLS data...</span>
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
              onClick={() => fetchData(selectedSeries.id)}
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
                {formatValue(latestValue)}
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                {chartData.length > 0 ? chartData[chartData.length - 1].displayDate : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Year-over-Year Change</div>
              <div className={`mt-2 text-3xl font-bold ${yearChange !== null && yearChange > 0 ? "text-emerald-600" : "text-red-600"}`}>
                {yearChange !== null ? `${yearChange >= 0 ? "+" : ""}${formatValue(yearChange)}` : "—"}
              </div>
              <p className="mt-2 text-xs text-zinc-600">vs. 12 months ago</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Data Points</div>
              <div className="mt-2 text-3xl font-bold text-zinc-900">{data.meta.dataPoints}</div>
              <p className="mt-2 text-xs text-zinc-600">
                {data.meta.startYear} - {data.meta.endYear}
              </p>
            </div>
          </section>

          {/* Time Series Chart */}
          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">{selectedSeries.name}</h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tickFormatter={(v) => formatValue(v)} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px" }}
                    formatter={(value: number | undefined) => [formatValue(value ?? null), selectedSeries.name]}
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

          {/* About This Indicator */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">About This Indicator</h2>
            <div className="space-y-3 text-sm text-zinc-700">
              {selectedSeries.id === "LNS14000000" && (
                <>
                  <p>
                    <strong>Unemployment Rate</strong> represents the percentage of the labor force that is jobless and
                    actively seeking employment.
                  </p>
                  <p>
                    Low unemployment (below 4%) is generally considered healthy. Very low rates may indicate labor
                    shortages and wage pressures. High rates signal economic weakness.
                  </p>
                </>
              )}
              {selectedSeries.id === "LNS11300000" && (
                <>
                  <p>
                    <strong>Labor Force Participation Rate</strong> measures the percentage of the civilian
                    noninstitutional population that is either employed or actively seeking employment.
                  </p>
                  <p>
                    This rate can decline during recessions as discouraged workers stop looking for jobs, and it's
                    affected by demographic trends like aging populations.
                  </p>
                </>
              )}
              {selectedSeries.id === "CES0500000003" && (
                <>
                  <p>
                    <strong>Average Hourly Earnings</strong> tracks the average amount employees earn per hour,
                    excluding benefits and overtime.
                  </p>
                  <p>
                    Rising wages can indicate labor market tightness and potential inflation pressures. The Fed watches
                    this closely when setting interest rates.
                  </p>
                </>
              )}
              {selectedSeries.id === "CES3000000001" && (
                <>
                  <p>
                    <strong>Manufacturing Employment</strong> represents the number of paid employees in the
                    manufacturing sector.
                  </p>
                  <p>
                    Manufacturing jobs are often seen as indicators of economic strength and have been in long-term
                    decline in the US due to automation and offshoring.
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-600">
                <strong>Data Source:</strong> Bureau of Labor Statistics (BLS)
                <br />
                <strong>Series ID:</strong> {data.seriesId}
                <br />
                <strong>Frequency:</strong> Monthly
                <br />
                <strong>Seasonal Adjustment:</strong> Seasonally adjusted where applicable
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
