// Backtest Engine Component
// Monte Carlo simulation for options strategies

"use client";

import { useState } from "react";
import { X, Play } from "lucide-react";

interface BacktestEngineProps {
  symbol: string;
  strike: number;
  type: "call" | "put";
  onClose: () => void;
}

interface SimulationResult {
  winRate: number;
  profitFactor: number;
  totalPL: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  outcomes: number[];
}

// Monte Carlo simulation using Geometric Brownian Motion
function runMonteCarloSimulation(
  initialPrice: number,
  strike: number,
  premium: number,
  daysToHold: number,
  volatility: number,
  numSimulations: number,
  type: "call" | "put"
): SimulationResult {
  const outcomes: number[] = [];
  let totalWins = 0;
  let totalLosses = 0;
  let sumWins = 0;
  let sumLosses = 0;
  let maxDrawdown = 0;
  let runningPL = 0;
  let peak = 0;

  const dt = 1 / 365; // Daily time step
  const drift = 0.05; // Assume 5% annual drift
  const sigma = volatility;

  for (let i = 0; i < numSimulations; i++) {
    let price = initialPrice;

    // Simulate price path using Geometric Brownian Motion
    for (let day = 0; day < daysToHold; day++) {
      const randomShock = (Math.random() - 0.5) * 2; // Simple random between -1 and 1
      const dW = randomShock * Math.sqrt(dt);
      price = price * Math.exp((drift - 0.5 * sigma ** 2) * dt + sigma * dW);
    }

    // Calculate P&L at exit
    let intrinsicValue = 0;
    if (type === "call") {
      intrinsicValue = Math.max(0, price - strike);
    } else {
      intrinsicValue = Math.max(0, strike - price);
    }

    const pl = intrinsicValue - premium;
    outcomes.push(pl);

    // Track wins/losses
    if (pl > 0) {
      totalWins++;
      sumWins += pl;
    } else {
      totalLosses++;
      sumLosses += Math.abs(pl);
    }

    // Track drawdown
    runningPL += pl;
    if (runningPL > peak) {
      peak = runningPL;
    }
    const drawdown = peak - runningPL;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  const winRate = (totalWins / numSimulations) * 100;
  const avgWin = totalWins > 0 ? sumWins / totalWins : 0;
  const avgLoss = totalLosses > 0 ? sumLosses / totalLosses : 0;
  const profitFactor = sumLosses > 0 ? sumWins / sumLosses : sumWins;
  const totalPL = outcomes.reduce((sum, pl) => sum + pl, 0);

  // Calculate Sharpe ratio (simplified)
  const avgReturn = totalPL / numSimulations;
  const variance =
    outcomes.reduce((sum, pl) => sum + (pl - avgReturn) ** 2, 0) /
    numSimulations;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  return {
    winRate,
    profitFactor,
    totalPL,
    sharpeRatio,
    maxDrawdown,
    avgWin,
    avgLoss,
    outcomes,
  };
}

export default function BacktestEngine({
  symbol,
  strike,
  type,
  onClose,
}: BacktestEngineProps) {
  const [numSims, setNumSims] = useState(1000);
  const [daysToHold, setDaysToHold] = useState(30);
  const [volatility, setVolatility] = useState(0.3);
  const [initialPrice, setInitialPrice] = useState(strike);
  const [premium, setPremium] = useState(5);
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);

  const runSimulation = () => {
    setRunning(true);
    setResults(null);

    // Run simulation in next tick to allow UI to update
    setTimeout(() => {
      const result = runMonteCarloSimulation(
        initialPrice,
        strike,
        premium,
        daysToHold,
        volatility,
        numSims,
        type
      );
      setResults(result);
      setRunning(false);
    }, 100);
  };

  const getInterpretation = (metric: string, value: number) => {
    switch (metric) {
      case "winRate":
        if (value > 60) return { text: "Excellent", color: "text-green-400" };
        if (value > 50) return { text: "Good", color: "text-blue-400" };
        if (value > 40) return { text: "Fair", color: "text-yellow-400" };
        return { text: "Poor", color: "text-red-400" };

      case "profitFactor":
        if (value > 2) return { text: "Excellent", color: "text-green-400" };
        if (value > 1.5) return { text: "Good", color: "text-blue-400" };
        if (value > 1) return { text: "Fair", color: "text-yellow-400" };
        return { text: "Poor", color: "text-red-400" };

      case "sharpe":
        if (value > 1.5) return { text: "Excellent", color: "text-green-400" };
        if (value > 1) return { text: "Good", color: "text-blue-400" };
        if (value > 0.5) return { text: "Fair", color: "text-yellow-400" };
        return { text: "Poor", color: "text-red-400" };

      default:
        return { text: "", color: "" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Backtest Engine</h2>
            <p className="text-sm text-neutral-400">
              Monte Carlo simulation for {symbol} ${strike} {type.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Parameters */}
        <div className="mb-6 space-y-4 rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
          <div className="text-sm font-semibold text-white">
            Simulation Parameters
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Number of Simulations */}
            <div>
              <label className="mb-1 block text-xs text-neutral-400">
                Number of Simulations
              </label>
              <input
                type="number"
                min="100"
                max="5000"
                step="100"
                value={numSims}
                onChange={(e) => setNumSims(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-white"
              />
            </div>

            {/* Days to Hold */}
            <div>
              <label className="mb-1 block text-xs text-neutral-400">
                Days to Hold
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={daysToHold}
                onChange={(e) => setDaysToHold(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-white"
              />
            </div>

            {/* Initial Price */}
            <div>
              <label className="mb-1 block text-xs text-neutral-400">
                Initial Stock Price
              </label>
              <input
                type="number"
                step="0.01"
                value={initialPrice}
                onChange={(e) => setInitialPrice(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-white"
              />
            </div>

            {/* Premium Paid */}
            <div>
              <label className="mb-1 block text-xs text-neutral-400">
                Premium Paid
              </label>
              <input
                type="number"
                step="0.01"
                value={premium}
                onChange={(e) => setPremium(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-white"
              />
            </div>

            {/* Volatility */}
            <div className="col-span-2">
              <label className="mb-1 flex items-center justify-between text-xs text-neutral-400">
                <span>Annual Volatility</span>
                <span className="font-mono text-blue-400">
                  {(volatility * 100).toFixed(0)}%
                </span>
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={volatility}
                onChange={(e) => setVolatility(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={runSimulation}
            disabled={running}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {running ? "Running Simulation..." : "Run Simulation"}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-4">
            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Win Rate */}
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
                <div className="text-xs text-neutral-400">Win Rate</div>
                <div className="text-2xl font-bold text-white">
                  {results.winRate.toFixed(1)}%
                </div>
                <div className={`text-xs ${getInterpretation("winRate", results.winRate).color}`}>
                  {getInterpretation("winRate", results.winRate).text}
                </div>
              </div>

              {/* Profit Factor */}
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
                <div className="text-xs text-neutral-400">Profit Factor</div>
                <div className="text-2xl font-bold text-white">
                  {results.profitFactor.toFixed(2)}
                </div>
                <div className={`text-xs ${getInterpretation("profitFactor", results.profitFactor).color}`}>
                  {getInterpretation("profitFactor", results.profitFactor).text}
                </div>
              </div>

              {/* Sharpe Ratio */}
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
                <div className="text-xs text-neutral-400">Sharpe Ratio</div>
                <div className="text-2xl font-bold text-white">
                  {results.sharpeRatio.toFixed(2)}
                </div>
                <div className={`text-xs ${getInterpretation("sharpe", results.sharpeRatio).color}`}>
                  {getInterpretation("sharpe", results.sharpeRatio).text}
                </div>
              </div>

              {/* Total P&L */}
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
                <div className="text-xs text-neutral-400">Total P&L</div>
                <div
                  className={`text-2xl font-bold ${
                    results.totalPL > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  ${results.totalPL.toFixed(0)}
                </div>
                <div className="text-xs text-neutral-400">
                  Across {numSims} sims
                </div>
              </div>

              {/* Max Drawdown */}
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
                <div className="text-xs text-neutral-400">Max Drawdown</div>
                <div className="text-2xl font-bold text-red-400">
                  ${results.maxDrawdown.toFixed(0)}
                </div>
                <div className="text-xs text-neutral-400">Largest loss</div>
              </div>

              {/* Avg Win */}
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
                <div className="text-xs text-neutral-400">Avg Win/Loss</div>
                <div className="text-2xl font-bold text-white">
                  ${results.avgWin.toFixed(2)}
                </div>
                <div className="text-xs text-neutral-400">
                  / ${results.avgLoss.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Interpretation Guide */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-neutral-300">
              <div className="mb-2 font-semibold text-blue-300">
                📊 What These Metrics Mean:
              </div>
              <ul className="ml-4 space-y-1 list-disc text-xs">
                <li>
                  <strong>Win Rate &gt; 60%:</strong> High probability strategy
                </li>
                <li>
                  <strong>Profit Factor &gt; 1.5:</strong> Making $1.50+ for every $1 lost
                </li>
                <li>
                  <strong>Sharpe &gt; 1:</strong> Good risk-adjusted returns
                </li>
                <li>
                  <strong>Max Drawdown:</strong> Worst-case loss to expect
                </li>
              </ul>
              <div className="mt-3 text-xs text-neutral-400">
                <strong>Disclaimer:</strong> Past simulations don't guarantee future
                results. Markets can behave differently than modeled.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
