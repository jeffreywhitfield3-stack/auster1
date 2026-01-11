"use client";

import Tip from "../Tip";

interface ExpectedMoveCalculatorProps {
  ticker: string;
  currentPrice: number;
  expectedMove: number;
  expectedMovePct: number;
  atmStraddle?: number;
}

export default function ExpectedMoveCalculator({
  ticker,
  currentPrice,
  expectedMove,
  expectedMovePct,
  atmStraddle,
}: ExpectedMoveCalculatorProps) {
  const rangeLow = currentPrice - expectedMove;
  const rangeHigh = currentPrice + expectedMove;

  // Calculate position on the range bar (0-100%)
  const rangeWidth = expectedMove * 2;
  const currentPosition = 50; // Current price is always in the middle

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">
          Expected Move Range
        </h3>
        <Tip
          label={
            <span className="text-sm font-semibold text-zinc-600">
              How is this calculated?
            </span>
          }
        >
          <p className="mb-2 font-semibold">Expected Move Calculation</p>
          <p className="mb-2">
            The expected move is derived from the price of an ATM (at-the-money)
            straddle, which represents the market&apos;s expectation of
            volatility.
          </p>
          <p className="mb-2">
            <span className="font-semibold">Formula:</span> ATM Straddle Price ×
            0.85
          </p>
          {atmStraddle && (
            <p className="mb-2 font-mono text-[11px]">
              ${atmStraddle.toFixed(2)} × 0.85 = ${expectedMove.toFixed(2)}
            </p>
          )}
          <p className="text-[11px] text-zinc-600">
            This represents approximately one standard deviation (1σ).
          </p>
        </Tip>
      </div>

      {/* Visual Range Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono text-zinc-600">
            ${rangeLow.toFixed(2)}
          </span>
          <span className="font-mono font-semibold text-zinc-900">
            ${currentPrice.toFixed(2)}
          </span>
          <span className="font-mono text-zinc-600">
            ${rangeHigh.toFixed(2)}
          </span>
        </div>

        {/* Range Bar */}
        <div className="relative h-12 rounded-lg bg-gradient-to-r from-red-100 via-yellow-50 to-red-100">
          {/* Left boundary */}
          <div className="absolute left-0 top-0 h-full w-1 bg-red-400" />
          {/* Right boundary */}
          <div className="absolute right-0 top-0 h-full w-1 bg-red-400" />
          {/* Current price marker */}
          <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-zinc-900" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 rounded-full bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white">
            Current
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-600">
          <span>Lower Bound</span>
          <span>Upper Bound</span>
        </div>
      </div>

      {/* Summary Box */}
      <div className="space-y-2 rounded-lg bg-zinc-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-700">Current Price:</span>
          <span className="font-mono text-sm font-semibold text-zinc-900">
            ${currentPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-700">Expected Move:</span>
          <span className="font-mono text-sm font-semibold text-zinc-900">
            ±${expectedMove.toFixed(2)} ({expectedMovePct.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-700">Expected Range:</span>
          <span className="font-mono text-sm font-semibold text-zinc-900">
            ${rangeLow.toFixed(2)} - ${rangeHigh.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Confidence Interval Explanation */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="mb-2 text-sm font-semibold text-blue-900">
          Understanding Confidence Intervals
        </p>
        <p className="mb-2 text-sm text-blue-800">
          <span className="font-semibold">1σ (68% confidence):</span> The stock
          has approximately a 68% probability of staying within this range
          through earnings.
        </p>
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Inverse:</span> There&apos;s a ~32%
          chance the stock moves beyond the expected range (16% chance on each
          side).
        </p>
      </div>

      {/* Strategy Implications */}
      <div className="space-y-2 rounded-lg bg-zinc-50 p-4">
        <p className="text-sm font-semibold text-zinc-900">
          Strategy Implications
        </p>
        <ul className="space-y-1 text-sm text-zinc-700">
          <li className="flex items-start gap-2">
            <span className="text-zinc-400">•</span>
            <span>
              <span className="font-semibold">Iron Condor:</span> Place wings
              outside ${rangeLow.toFixed(2)} - ${rangeHigh.toFixed(2)} for
              higher probability of profit
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-400">•</span>
            <span>
              <span className="font-semibold">Straddle/Strangle:</span> Needs
              move beyond expected range to profit
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-400">•</span>
            <span>
              <span className="font-semibold">Vertical Spread:</span> Check if
              breakevens fall within or outside expected range
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
