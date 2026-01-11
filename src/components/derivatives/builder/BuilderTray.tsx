"use client";

import { useState } from "react";
import type { Strategy } from "@/types/derivatives";
import { fmtUSD } from "@/lib/derivatives/formatting";

interface BuilderTrayProps {
  strategy: Strategy | null;
  isExpanded: boolean;
  onToggle: () => void;
  onClear: () => void;
  onSave?: () => void;
  onAddLeg?: () => void;
}

export default function BuilderTray({
  strategy,
  isExpanded,
  onToggle,
  onClear,
  onSave,
  onAddLeg,
}: BuilderTrayProps) {
  if (!isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-2xl text-white shadow-lg hover:bg-zinc-800"
      >
        📊
      </button>
    );
  }

  const legCount = strategy?.legs.length ?? 0;
  const maxProfit = strategy?.maxProfit ?? 0;
  const maxLoss = strategy?.maxLoss ?? 0;
  const creditDebit = strategy?.creditDebit ?? 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-zinc-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 p-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Strategy Builder</h3>
          <p className="text-xs text-zinc-600">
            {legCount} {legCount === 1 ? "leg" : "legs"}
          </p>
        </div>
        <button
          onClick={onToggle}
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
        >
          ✕
        </button>
      </div>

      {/* Summary */}
      {strategy && legCount > 0 ? (
        <div className="border-b border-zinc-200 p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Max Profit</span>
              <span className="font-semibold text-emerald-700">{fmtUSD(maxProfit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Max Loss</span>
              <span className="font-semibold text-red-700">{fmtUSD(Math.abs(maxLoss))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Net Credit/Debit</span>
              <span className={`font-semibold ${creditDebit > 0 ? "text-emerald-700" : "text-red-700"}`}>
                {fmtUSD(creditDebit)}
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
            <span className="font-semibold">Underlying:</span> {strategy.underlying} @ ${(strategy.underlyingPrice ?? 0).toFixed(2)}
          </div>
        </div>
      ) : (
        <div className="border-b border-zinc-200 p-4 text-center text-sm text-zinc-600">
          No legs added yet. Use a template or add manually.
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 p-4">
        {onAddLeg && (
          <button
            onClick={onAddLeg}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            + Add Leg
          </button>
        )}

        {legCount > 0 && (
          <>
            {onSave && (
              <button
                onClick={onSave}
                className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Save Strategy
              </button>
            )}

            <button
              onClick={onClear}
              className="w-full rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Clear All
            </button>
          </>
        )}
      </div>

      {/* Quick Tips */}
      <div className="border-t border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
        💡 <span className="font-semibold">Tip:</span> Click legs in the chain to add them, or use templates for quick setup.
      </div>
    </div>
  );
}
