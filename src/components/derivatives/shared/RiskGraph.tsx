// Risk Graph Component
// P&L visualization with Black-Scholes modeling and theta decay

"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface RiskGraphProps {
  strike: number;
  premium: number;
  type: "call" | "put";
  expiration: string;
  currentPrice: number;
  volatility: number;
  onClose: () => void;
}

// Error function (erf) approximation
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

// Black-Scholes formula for option pricing
function blackScholes(
  S: number, // Current stock price
  K: number, // Strike price
  T: number, // Time to expiration (years)
  r: number, // Risk-free rate
  sigma: number, // Volatility (as decimal)
  type: "call" | "put"
): number {
  if (T <= 0) {
    // At expiration, intrinsic value only
    if (type === "call") {
      return Math.max(0, S - K);
    } else {
      return Math.max(0, K - S);
    }
  }

  const d1 =
    (Math.log(S / K) + (r + (sigma ** 2) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  // Standard normal CDF approximation
  const cdf = (x: number) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  };

  if (type === "call") {
    return S * cdf(d1) - K * Math.exp(-r * T) * cdf(d2);
  } else {
    return K * Math.exp(-r * T) * cdf(-d2) - S * cdf(-d1);
  }
}

export default function RiskGraph({
  strike,
  premium,
  type,
  expiration,
  currentPrice,
  volatility,
  onClose,
}: RiskGraphProps) {
  // Calculate days to expiration
  const daysToExpiration = useMemo(() => {
    const expDate = new Date(expiration);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [expiration]);

  const [priceRange, setPriceRange] = useState(20); // % range
  const [daysAhead, setDaysAhead] = useState(
    Math.floor(daysToExpiration / 2)
  );

  const sigma = volatility;
  const r = 0.05; // Risk-free rate (5%)

  // Generate price points for the graph
  const chartData = useMemo(() => {
    const minPrice = currentPrice * (1 - priceRange / 100);
    const maxPrice = currentPrice * (1 + priceRange / 100);
    const step = (maxPrice - minPrice) / 100;

    const data = [];

    for (let price = minPrice; price <= maxPrice; price += step) {
      // P&L at expiration (intrinsic value - premium paid)
      let plAtExpiration = 0;
      if (type === "call") {
        plAtExpiration = Math.max(0, price - strike) - premium;
      } else {
        plAtExpiration = Math.max(0, strike - price) - premium;
      }

      // P&L before expiration (Black-Scholes value - premium paid)
      const daysRemaining = Math.max(0, daysToExpiration - daysAhead);
      const timeToExp = daysRemaining / 365;
      const bsValue = blackScholes(price, strike, timeToExp, r, sigma, type);
      const plBeforeExp = bsValue - premium;

      data.push({
        price: Math.round(price * 100) / 100,
        atExpiration: Math.round(plAtExpiration * 100) / 100,
        beforeExpiration: Math.round(plBeforeExp * 100) / 100,
      });
    }

    return data;
  }, [currentPrice, priceRange, strike, premium, type, daysAhead, daysToExpiration, sigma, r]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const maxProfit =
      type === "call"
        ? "Unlimited"
        : ((strike - premium) * 100).toFixed(0);

    const maxLoss = (premium * 100).toFixed(0);

    const breakEven =
      type === "call" ? strike + premium : strike - premium;

    // Probability of profit (rough estimate based on distance from current price)
    const stdDev = currentPrice * sigma * Math.sqrt(daysToExpiration / 365);
    const zScore = (breakEven - currentPrice) / stdDev;
    const probProfit = type === "call"
      ? (1 - (1 + erf(zScore / Math.sqrt(2))) / 2) * 100
      : ((1 + erf(zScore / Math.sqrt(2))) / 2) * 100;

    return {
      maxProfit,
      maxLoss,
      breakEven: breakEven.toFixed(2),
      probProfit: probProfit.toFixed(1),
    };
  }, [type, strike, premium, currentPrice, sigma, daysToExpiration]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Risk Graph</h2>
            <p className="text-sm text-neutral-400">
              Strike ${strike} · {type.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Key Metrics */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
            <div className="text-xs text-neutral-400">Max Profit</div>
            <div className="text-lg font-bold text-green-400">
              {metrics.maxProfit === "Unlimited" ? "∞" : `$${metrics.maxProfit}`}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
            <div className="text-xs text-neutral-400">Max Loss</div>
            <div className="text-lg font-bold text-red-400">
              ${metrics.maxLoss}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
            <div className="text-xs text-neutral-400">Break-Even</div>
            <div className="text-lg font-bold text-blue-400">
              ${metrics.breakEven}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
            <div className="text-xs text-neutral-400">Prob. of Profit</div>
            <div className="text-lg font-bold text-yellow-400">
              {metrics.probProfit}%
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mb-6 rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
              <XAxis
                dataKey="price"
                stroke="#a3a3a3"
                label={{ value: "Stock Price", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                stroke="#a3a3a3"
                label={{ value: "P&L ($)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #404040",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#ffffff" }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              <ReferenceLine
                x={currentPrice}
                stroke="#fbbf24"
                strokeDasharray="3 3"
                label={{ value: "Current", fill: "#fbbf24", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="atExpiration"
                stroke="#22c55e"
                name="At Expiration"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="beforeExpiration"
                stroke="#f97316"
                name={`${daysAhead} Days Out`}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive Controls */}
        <div className="space-y-4">
          {/* Price Range Slider */}
          <div>
            <label className="mb-2 flex items-center justify-between text-sm text-neutral-300">
              <span>Price Range</span>
              <span className="font-mono text-blue-400">±{priceRange}%</span>
            </label>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Days Ahead Slider */}
          <div>
            <label className="mb-2 flex items-center justify-between text-sm text-neutral-300">
              <span>Days to Hold</span>
              <span className="font-mono text-orange-400">
                {daysAhead} days ({daysToExpiration - daysAhead} DTE remaining)
              </span>
            </label>
            <input
              type="range"
              min="0"
              max={daysToExpiration}
              step="1"
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Educational Info */}
        <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-neutral-300">
          <div className="mb-2 font-semibold text-blue-300">📊 How to read this graph:</div>
          <ul className="ml-4 space-y-1 list-disc">
            <li>
              <strong className="text-white">Green line:</strong> Your P&L if you hold until
              expiration
            </li>
            <li>
              <strong className="text-white">Orange dashed line:</strong> Your P&L if you
              exit at the selected timeframe (includes theta decay)
            </li>
            <li>
              <strong className="text-white">Yellow vertical line:</strong> Current stock
              price
            </li>
            <li>
              <strong className="text-white">Break-even:</strong> Stock price where you
              neither profit nor lose
            </li>
          </ul>
          <div className="mt-3 text-xs text-neutral-400">
            <strong>Note:</strong> This uses Black-Scholes pricing model. Actual prices
            may vary due to bid-ask spread, liquidity, and market conditions.
          </div>
        </div>
      </div>
    </div>
  );
}
