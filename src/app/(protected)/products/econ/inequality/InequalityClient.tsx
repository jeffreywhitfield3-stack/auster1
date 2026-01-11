"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

type StateData = {
  fips: string;
  name: string;
  population: number | null;
  medianIncome: number | null;
  povertyRate: number | null;
  bachelorsPlus: number | null;
  medianRent: number | null;
};

type CensusResponse = {
  year: number;
  rows: StateData[];
};

function calculateGini(incomes: number[]): number {
  if (incomes.length === 0) return 0;
  const sorted = [...incomes].sort((a, b) => a - b);
  const n = sorted.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (i + 1) * sorted[i];
  }
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  return (2 * sum) / (n * n * mean) - (n + 1) / n;
}

export default function InequalityClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CensusResponse | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/econ/census/state");
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
    fetchData();
  }, []);

  const giniCoefficient = useMemo(() => {
    if (!data) return null;
    const incomes = data.rows.map((r) => r.medianIncome).filter((v): v is number => v !== null);
    return calculateGini(incomes);
  }, [data]);

  const topStates = useMemo(() => {
    if (!data) return [];
    return [...data.rows]
      .filter((r) => r.medianIncome !== null)
      .sort((a, b) => (b.medianIncome || 0) - (a.medianIncome || 0))
      .slice(0, 10);
  }, [data]);

  const bottomStates = useMemo(() => {
    if (!data) return [];
    return [...data.rows]
      .filter((r) => r.medianIncome !== null)
      .sort((a, b) => (a.medianIncome || 0) - (b.medianIncome || 0))
      .slice(0, 10);
  }, [data]);

  const incomeVsPoverty = useMemo(() => {
    if (!data) return [];
    return data.rows
      .filter((r) => r.medianIncome !== null && r.povertyRate !== null)
      .map((r) => ({
        name: r.name,
        medianIncome: r.medianIncome!,
        povertyRate: r.povertyRate!,
      }))
      .sort((a, b) => b.medianIncome - a.medianIncome);
  }, [data]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Link
              href="/products/econ"
              className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
            >
              ← Back to Econ Lab
            </Link>
            <h1 className="mt-4 text-4xl font-bold text-zinc-900 sm:text-5xl">
              📊 Inequality &amp; Disparities Lab
            </h1>
            <p className="mt-4 text-lg leading-7 text-zinc-600">
              Surfacing patterns that shape society. Analyze income distribution, wage gaps, and structural inequalities.
            </p>
          </div>
          <Link
            href="/research/publish?from=econ-inequality"
            className="flex items-center gap-2 rounded-lg border-2 border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:border-blue-700 hover:bg-blue-700"
          >
            <span>📊</span>
            <span>Publish to Research Stage</span>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mb-8 rounded-xl border border-violet-200 bg-violet-50 p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent"></div>
            <span className="text-sm font-semibold text-violet-900">Loading Census data...</span>
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
              onClick={fetchData}
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
            <div className="rounded-xl border border-violet-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">Gini Coefficient</div>
              <div className="mt-2 text-3xl font-bold text-violet-900">{giniCoefficient?.toFixed(4) || "—"}</div>
              <p className="mt-2 text-xs text-zinc-600">
                Measure of income inequality across US states. 0 = perfect equality, 1 = maximum inequality.
              </p>
            </div>

            <div className="rounded-xl border border-violet-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">Data Year</div>
              <div className="mt-2 text-3xl font-bold text-violet-900">{data.year}</div>
              <p className="mt-2 text-xs text-zinc-600">American Community Survey (ACS) 5-year estimates</p>
            </div>

            <div className="rounded-xl border border-violet-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">States Analyzed</div>
              <div className="mt-2 text-3xl font-bold text-violet-900">{data.rows.length}</div>
              <p className="mt-2 text-xs text-zinc-600">US states + DC + Puerto Rico</p>
            </div>
          </section>

          {/* Top 10 States by Income */}
          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">Top 10 States by Median Household Income</h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topStates} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={110} />
                  <Tooltip
                    formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, "Median Income"]}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Bar dataKey="medianIncome" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Bottom 10 States by Income */}
          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">Bottom 10 States by Median Household Income</h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bottomStates} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={110} />
                  <Tooltip
                    formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, "Median Income"]}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Bar dataKey="medianIncome" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Income vs Poverty Correlation */}
          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">
              Income vs Poverty: Correlation Analysis
            </h2>
            <p className="mb-6 text-sm text-zinc-600">
              Higher median income states tend to have lower poverty rates, demonstrating the inverse relationship
              between income and poverty.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-4 py-3 text-left font-semibold text-zinc-900">State</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-900">Median Income</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-900">Poverty Rate</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-900">Bachelors+</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeVsPoverty.slice(0, 15).map((state, idx) => (
                    <tr key={state.name} className="border-b border-zinc-100">
                      <td className="px-4 py-3 font-medium text-zinc-900">{state.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-700">
                        ${state.medianIncome.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-700">
                        {state.povertyRate.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-700">
                        {data.rows.find((r) => r.name === state.name)?.bachelorsPlus?.toFixed(1) || "—"}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Methodology */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">Methodology &amp; Data Sources</h2>
            <div className="space-y-4 text-sm text-zinc-700">
              <div>
                <strong>Data Source:</strong> US Census Bureau, American Community Survey (ACS) {data.year} 5-year
                estimates
              </div>
              <div>
                <strong>Gini Coefficient:</strong> Calculated using state-level median household incomes. Formula:{" "}
                <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs">
                  G = (2 × Σ(i × y_i)) / (n² × ȳ) - (n + 1) / n
                </code>
              </div>
              <div>
                <strong>Variables:</strong>
                <ul className="ml-4 mt-2 list-disc space-y-1">
                  <li>Median Household Income (B19013_001E)</li>
                  <li>Poverty Rate (B17001_002E / B17001_001E)</li>
                  <li>Educational Attainment: Bachelors+ (B15003_022E through B15003_025E)</li>
                  <li>Median Gross Rent (B25064_001E)</li>
                </ul>
              </div>
              <div>
                <strong>Limitations:</strong> State-level aggregation masks within-state inequality. Individual-level
                data would provide more granular insights.
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
