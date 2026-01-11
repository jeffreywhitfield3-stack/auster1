"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// OLS Regression calculation
function calculateOLS(data: { x: number; y: number }[]) {
  const n = data.length;
  if (n === 0) return null;

  const sumX = data.reduce((sum, p) => sum + p.x, 0);
  const sumY = data.reduce((sum, p) => sum + p.y, 0);
  const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumY2 = data.reduce((sum, p) => sum + p.y * p.y, 0);

  const meanX = sumX / n;
  const meanY = sumY / n;

  const beta = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const alpha = meanY - beta * meanX;

  // R-squared
  const yPredictions = data.map((p) => alpha + beta * p.x);
  const ssTot = data.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
  const ssRes = data.reduce((sum, p, i) => sum + Math.pow(p.y - yPredictions[i], 2), 0);
  const rSquared = 1 - ssRes / ssTot;

  // Standard errors
  const residuals = data.map((p, i) => p.y - yPredictions[i]);
  const se = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2));
  const seAlpha = se * Math.sqrt((1 / n) + (meanX * meanX) / data.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2), 0));
  const seBeta = se / Math.sqrt(data.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2), 0));

  // T-statistics
  const tAlpha = alpha / seAlpha;
  const tBeta = beta / seBeta;

  // P-values (two-tailed, approximate using normal distribution for large n)
  const pAlpha = 2 * (1 - normalCDF(Math.abs(tAlpha)));
  const pBeta = 2 * (1 - normalCDF(Math.abs(tBeta)));

  return {
    alpha,
    beta,
    rSquared,
    seAlpha,
    seBeta,
    tAlpha,
    tBeta,
    pAlpha,
    pBeta,
    n,
    predictions: yPredictions,
  };
}

// Normal CDF approximation
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// Sample datasets
const sampleDatasets = {
  "gdp-unemployment": {
    name: "GDP Growth vs Unemployment",
    xLabel: "GDP Growth (%)",
    yLabel: "Unemployment Rate (%)",
    data: [
      { x: 2.3, y: 5.8 },
      { x: 3.1, y: 5.2 },
      { x: 1.6, y: 6.3 },
      { x: 2.9, y: 5.5 },
      { x: 3.5, y: 4.9 },
      { x: 1.2, y: 6.7 },
      { x: 2.7, y: 5.6 },
      { x: 3.8, y: 4.5 },
      { x: 1.9, y: 6.1 },
      { x: 2.5, y: 5.7 },
    ],
  },
  "education-income": {
    name: "Education vs Income",
    xLabel: "Years of Education",
    yLabel: "Annual Income ($1000s)",
    data: [
      { x: 12, y: 35 },
      { x: 14, y: 42 },
      { x: 16, y: 58 },
      { x: 18, y: 72 },
      { x: 12, y: 38 },
      { x: 14, y: 45 },
      { x: 16, y: 62 },
      { x: 18, y: 78 },
      { x: 20, y: 95 },
      { x: 12, y: 32 },
    ],
  },
  "custom": {
    name: "Custom Data",
    xLabel: "X Variable",
    yLabel: "Y Variable",
    data: [],
  },
};

export default function EconometricsClient() {
  const [selectedDataset, setSelectedDataset] = useState<keyof typeof sampleDatasets>("gdp-unemployment");
  const [customInput, setCustomInput] = useState("");

  const currentData = useMemo(() => {
    if (selectedDataset === "custom") {
      // Parse custom input
      try {
        const lines = customInput.trim().split("\n");
        const data = lines
          .map((line) => {
            const [x, y] = line.split(/[,\s]+/).map(Number);
            return { x, y };
          })
          .filter((p) => !isNaN(p.x) && !isNaN(p.y));
        return data;
      } catch {
        return [];
      }
    }
    return sampleDatasets[selectedDataset].data;
  }, [selectedDataset, customInput]);

  const regression = useMemo(() => calculateOLS(currentData), [currentData]);

  const regressionLine = useMemo(() => {
    if (!regression) return [];
    const minX = Math.min(...currentData.map((p) => p.x));
    const maxX = Math.max(...currentData.map((p) => p.x));
    return [
      { x: minX, y: regression.alpha + regression.beta * minX },
      { x: maxX, y: regression.alpha + regression.beta * maxX },
    ];
  }, [regression, currentData]);

  const dataset = sampleDatasets[selectedDataset];

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
          🧮 Econometrics Lab
        </h1>
        <p className="mt-4 text-lg leading-7 text-zinc-600">
          Evidence, inference, and rigor. Run ordinary least squares regression and explore causal relationships.
        </p>
      </div>

      {/* Dataset Selection */}
      <section className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="mb-4 text-lg font-bold text-blue-900">Select Dataset</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(sampleDatasets).map(([key, ds]) => (
            <button
              key={key}
              onClick={() => setSelectedDataset(key as keyof typeof sampleDatasets)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                selectedDataset === key
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-blue-300 bg-white text-blue-900 hover:border-blue-400"
              }`}
            >
              {ds.name}
            </button>
          ))}
        </div>

        {selectedDataset === "custom" && (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-blue-900">
              Enter custom data (one X,Y pair per line):
            </label>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="mt-2 w-full rounded-lg border border-blue-300 p-3 font-mono text-sm"
              rows={8}
              placeholder="1.5, 10&#10;2.0, 15&#10;2.5, 18&#10;3.0, 22"
            />
            <p className="mt-2 text-xs text-blue-700">
              Format: X, Y (comma or space separated). One pair per line.
            </p>
          </div>
        )}
      </section>

      {/* Visualization */}
      {currentData.length > 0 && (
        <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-zinc-900">Scatter Plot with Regression Line</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={dataset.xLabel}
                  label={{ value: dataset.xLabel, position: "insideBottom", offset: -10 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={dataset.yLabel}
                  label={{ value: dataset.yLabel, angle: -90, position: "insideLeft" }}
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter name="Observations" data={currentData} fill="#3b82f6" />
                <Line
                  type="linear"
                  data={regressionLine}
                  dataKey="y"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  legendType="line"
                  name="OLS Regression Line"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Regression Results */}
      {regression && (
        <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-6 text-lg font-bold text-zinc-900">Regression Results</h2>

          {/* Equation */}
          <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-700">Regression Equation:</p>
            <p className="mt-2 font-mono text-base text-zinc-900">
              Y = {regression.alpha.toFixed(4)} {regression.beta >= 0 ? "+" : ""} {regression.beta.toFixed(4)} × X
            </p>
          </div>

          {/* Coefficients Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 text-left font-semibold text-zinc-900">Coefficient</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-900">Estimate</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-900">Std. Error</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-900">t-statistic</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-900">p-value</th>
                  <th className="px-4 py-3 text-center font-semibold text-zinc-900">Significance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-mono text-zinc-700">Intercept (α)</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-900">{regression.alpha.toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700">{regression.seAlpha.toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700">{regression.tAlpha.toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700">{regression.pAlpha.toFixed(4)}</td>
                  <td className="px-4 py-3 text-center">
                    {regression.pAlpha < 0.01 ? (
                      <span className="text-green-600">***</span>
                    ) : regression.pAlpha < 0.05 ? (
                      <span className="text-green-600">**</span>
                    ) : regression.pAlpha < 0.1 ? (
                      <span className="text-yellow-600">*</span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-zinc-700">Slope (β)</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-900">{regression.beta.toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700">{regression.seBeta.toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700">{regression.tBeta.toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700">{regression.pBeta.toFixed(4)}</td>
                  <td className="px-4 py-3 text-center">
                    {regression.pBeta < 0.01 ? (
                      <span className="text-green-600">***</span>
                    ) : regression.pBeta < 0.05 ? (
                      <span className="text-green-600">**</span>
                    ) : regression.pBeta < 0.1 ? (
                      <span className="text-yellow-600">*</span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            Significance codes: *** p &lt; 0.01, ** p &lt; 0.05, * p &lt; 0.1
          </p>

          {/* Model Fit */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">R-squared</div>
              <div className="mt-2 text-2xl font-bold text-zinc-900">{regression.rSquared.toFixed(4)}</div>
              <p className="mt-1 text-xs text-zinc-600">
                {(regression.rSquared * 100).toFixed(1)}% of variance explained
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Observations</div>
              <div className="mt-2 text-2xl font-bold text-zinc-900">{regression.n}</div>
              <p className="mt-1 text-xs text-zinc-600">Data points in regression</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Degrees of Freedom</div>
              <div className="mt-2 text-2xl font-bold text-zinc-900">{regression.n - 2}</div>
              <p className="mt-1 text-xs text-zinc-600">For residual variance</p>
            </div>
          </div>
        </section>
      )}

      {/* Interpretation Guide */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Interpretation Guide</h2>
        <div className="space-y-4 text-sm text-zinc-700">
          <div>
            <strong>Intercept (α):</strong> The predicted value of Y when X = 0. May not always be meaningful depending
            on your data.
          </div>
          <div>
            <strong>Slope (β):</strong> The change in Y associated with a one-unit increase in X. This is your key
            coefficient of interest.
          </div>
          <div>
            <strong>R-squared:</strong> Proportion of variance in Y explained by X. Higher values (closer to 1) indicate
            better fit.
          </div>
          <div>
            <strong>p-value:</strong> Probability of observing this coefficient if the true effect were zero. Values
            below 0.05 are typically considered statistically significant.
          </div>
          <div>
            <strong>Standard Error:</strong> Uncertainty around the coefficient estimate. Smaller values indicate more
            precise estimates.
          </div>
        </div>
      </section>
    </main>
  );
}
