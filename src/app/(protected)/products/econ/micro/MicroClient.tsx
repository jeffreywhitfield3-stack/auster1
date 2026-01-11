"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

// Demand function: Q = a - b*P
function calculateDemand(price: number, intercept: number, slope: number): number {
  return Math.max(0, intercept - slope * price);
}

// Price elasticity of demand: E = (dQ/dP) * (P/Q)
function calculateElasticity(price: number, quantity: number, slope: number): number {
  if (quantity === 0) return 0;
  return (-slope * price) / quantity;
}

// Consumer surplus: ∫(demand curve - price) from 0 to Q
function calculateConsumerSurplus(price: number, quantity: number, intercept: number, slope: number): number {
  if (quantity === 0) return 0;
  const maxPrice = intercept / slope; // Price intercept
  return 0.5 * (maxPrice - price) * quantity;
}

type DemandScenario = {
  name: string;
  intercept: number;
  slope: number;
  description: string;
};

const demandScenarios: DemandScenario[] = [
  {
    name: "Coffee Demand",
    intercept: 1000,
    slope: 100,
    description: "Daily cups demanded in a local market",
  },
  {
    name: "Gasoline Demand",
    intercept: 500,
    slope: 50,
    description: "Weekly gallons demanded (relatively inelastic)",
  },
  {
    name: "Movie Tickets",
    intercept: 800,
    slope: 150,
    description: "Weekly tickets sold (more elastic)",
  },
  {
    name: "Custom",
    intercept: 100,
    slope: 10,
    description: "Design your own demand curve",
  },
];

export default function MicroClient() {
  const [selectedScenario, setSelectedScenario] = useState(demandScenarios[0]);
  const [currentPrice, setCurrentPrice] = useState(5);
  const [customIntercept, setCustomIntercept] = useState(100);
  const [customSlope, setCustomSlope] = useState(10);

  const scenario =
    selectedScenario.name === "Custom"
      ? { ...selectedScenario, intercept: customIntercept, slope: customSlope }
      : selectedScenario;

  const maxPrice = scenario.intercept / scenario.slope;
  const priceStep = maxPrice / 100;

  const demandCurve = useMemo(() => {
    const points = [];
    for (let p = 0; p <= maxPrice; p += priceStep) {
      const q = calculateDemand(p, scenario.intercept, scenario.slope);
      points.push({ price: p, quantity: q });
    }
    return points;
  }, [scenario.intercept, scenario.slope, maxPrice, priceStep]);

  const currentQuantity = useMemo(
    () => calculateDemand(currentPrice, scenario.intercept, scenario.slope),
    [currentPrice, scenario.intercept, scenario.slope]
  );

  const elasticity = useMemo(
    () => calculateElasticity(currentPrice, currentQuantity, scenario.slope),
    [currentPrice, currentQuantity, scenario.slope]
  );

  const consumerSurplus = useMemo(
    () => calculateConsumerSurplus(currentPrice, currentQuantity, scenario.intercept, scenario.slope),
    [currentPrice, currentQuantity, scenario.intercept, scenario.slope]
  );

  const revenue = currentPrice * currentQuantity;

  const elasticityInterpretation = useMemo(() => {
    const absE = Math.abs(elasticity);
    if (absE > 1) return { label: "Elastic", color: "text-blue-600", description: "Demand is sensitive to price changes" };
    if (absE === 1) return { label: "Unit Elastic", color: "text-yellow-600", description: "Proportional response to price" };
    return { label: "Inelastic", color: "text-red-600", description: "Demand is relatively insensitive to price changes" };
  }, [elasticity]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/products/econ"
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700"
        >
          ← Back to Econ Lab
        </Link>
        <h1 className="mt-4 text-4xl font-bold text-zinc-900 sm:text-5xl">
          🏪 Microeconomics Lab
        </h1>
        <p className="mt-4 text-lg leading-7 text-zinc-600">
          Individual and firm-level dynamics. Analyze consumer demand, price elasticity, and market behavior.
        </p>
      </div>

      {/* Scenario Selection */}
      <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="mb-4 text-lg font-bold text-amber-900">Select Market Scenario</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {demandScenarios.map((scenario) => (
            <button
              key={scenario.name}
              onClick={() => setSelectedScenario(scenario)}
              className={`rounded-lg border p-4 text-left transition-all ${
                selectedScenario.name === scenario.name
                  ? "border-amber-600 bg-white shadow-md"
                  : "border-amber-300 bg-white hover:border-amber-400"
              }`}
            >
              <div className="font-semibold text-amber-900">{scenario.name}</div>
              <div className="mt-1 text-xs text-zinc-600">{scenario.description}</div>
            </button>
          ))}
        </div>

        {selectedScenario.name === "Custom" && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-amber-900">Demand Intercept (a)</label>
              <input
                type="number"
                value={customIntercept}
                onChange={(e) => setCustomIntercept(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-amber-300 px-4 py-2"
                min="1"
                step="10"
              />
              <p className="mt-1 text-xs text-zinc-600">Maximum quantity demanded when price = 0</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-amber-900">Slope (b)</label>
              <input
                type="number"
                value={customSlope}
                onChange={(e) => setCustomSlope(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-amber-300 px-4 py-2"
                min="0.1"
                step="1"
              />
              <p className="mt-1 text-xs text-zinc-600">How much quantity decreases per $1 price increase</p>
            </div>
          </div>
        )}
      </section>

      {/* Price Control */}
      <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Set Market Price</h2>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max={maxPrice}
            step={priceStep}
            value={currentPrice}
            onChange={(e) => setCurrentPrice(Number(e.target.value))}
            className="flex-1"
          />
          <div className="text-2xl font-bold text-zinc-900">${currentPrice.toFixed(2)}</div>
        </div>
        <p className="mt-2 text-sm text-zinc-600">
          Adjust the price to see how quantity demanded, elasticity, and consumer surplus change.
        </p>
      </section>

      {/* Key Metrics */}
      <section className="mb-8 grid gap-6 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Quantity Demanded</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900">{currentQuantity.toFixed(0)}</div>
          <p className="mt-2 text-xs text-zinc-600">Units at current price</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Price Elasticity</div>
          <div className={`mt-2 text-3xl font-bold ${elasticityInterpretation.color}`}>
            {elasticity.toFixed(2)}
          </div>
          <p className="mt-2 text-xs text-zinc-600">{elasticityInterpretation.label}</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Total Revenue</div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">${revenue.toFixed(2)}</div>
          <p className="mt-2 text-xs text-zinc-600">Price × Quantity</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Consumer Surplus</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">${consumerSurplus.toFixed(2)}</div>
          <p className="mt-2 text-xs text-zinc-600">Area above price, below demand</p>
        </div>
      </section>

      {/* Demand Curve Visualization */}
      <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Demand Curve</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={demandCurve} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="consumerSurplus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="quantity"
                label={{ value: "Quantity", position: "insideBottom", offset: -10 }}
              />
              <YAxis
                dataKey="price"
                label={{ value: "Price ($)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                formatter={(value: number | undefined, name: string | undefined) => [
                  name === "price" ? `$${(value ?? 0).toFixed(2)}` : (value ?? 0).toFixed(0),
                  name === "price" ? "Price" : "Quantity",
                ]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#consumerSurplus)"
              />
              {/* Current price line */}
              <Line
                type="monotone"
                data={[
                  { quantity: 0, price: currentPrice },
                  { quantity: currentQuantity, price: currentPrice },
                ]}
                dataKey="price"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              {/* Current quantity line */}
              <Line
                type="monotone"
                data={[
                  { quantity: currentQuantity, price: 0 },
                  { quantity: currentQuantity, price: currentPrice },
                ]}
                dataKey="price"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
            <span className="text-zinc-700">Demand Curve</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-8 border-t-2 border-dashed border-red-500"></div>
            <span className="text-zinc-700">Current Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-8 border-t-2 border-dashed border-emerald-500"></div>
            <span className="text-zinc-700">Current Quantity</span>
          </div>
        </div>
      </section>

      {/* Elasticity Analysis */}
      <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Elasticity Analysis</h2>
        <div className="space-y-4 text-sm text-zinc-700">
          <div>
            <strong>Current Elasticity:</strong> {elasticity.toFixed(2)} ({elasticityInterpretation.label})
          </div>
          <div>{elasticityInterpretation.description}</div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="font-semibold text-zinc-900">What does this mean?</p>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              {Math.abs(elasticity) > 1 ? (
                <>
                  <li>A 1% price increase leads to more than 1% decrease in quantity demanded</li>
                  <li>Consumers are price-sensitive - consider keeping prices competitive</li>
                  <li>Lowering price may increase total revenue</li>
                </>
              ) : (
                <>
                  <li>A 1% price increase leads to less than 1% decrease in quantity demanded</li>
                  <li>Consumers are relatively insensitive to price changes</li>
                  <li>Raising price may increase total revenue</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Methodology &amp; Formulas</h2>
        <div className="space-y-4 text-sm text-zinc-700">
          <div>
            <strong>Demand Function:</strong>
            <code className="ml-2 rounded bg-zinc-100 px-2 py-1 font-mono text-xs">
              Q = {scenario.intercept} - {scenario.slope} × P
            </code>
          </div>
          <div>
            <strong>Price Elasticity of Demand:</strong>
            <code className="ml-2 rounded bg-zinc-100 px-2 py-1 font-mono text-xs">
              E = (dQ/dP) × (P/Q) = -{scenario.slope} × (P/Q)
            </code>
          </div>
          <div>
            <strong>Total Revenue:</strong>
            <code className="ml-2 rounded bg-zinc-100 px-2 py-1 font-mono text-xs">TR = P × Q</code>
          </div>
          <div>
            <strong>Consumer Surplus:</strong>
            <code className="ml-2 rounded bg-zinc-100 px-2 py-1 font-mono text-xs">
              CS = 0.5 × (P_max - P) × Q
            </code>
            <p className="mt-1 text-xs text-zinc-600">
              The triangular area between the demand curve and the market price
            </p>
          </div>
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="font-semibold text-zinc-900">Linear Demand Assumptions</p>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-xs">
              <li>This model assumes linear demand, which is a simplification of real-world behavior</li>
              <li>Elasticity varies along a linear demand curve (more elastic at higher prices)</li>
              <li>Real markets may have non-linear demand with different curvature</li>
              <li>External factors (income, preferences, substitutes) are held constant</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
