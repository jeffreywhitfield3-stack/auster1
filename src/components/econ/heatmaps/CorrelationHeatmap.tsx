"use client";

import React, { useMemo, useState } from "react";

export default function CorrelationHeatmap(props: {
  labels: { id: string; title: string }[];
  matrix: number[][];
}) {
  const { labels, matrix } = props;

  const [hover, setHover] = useState<{ i: number; j: number; v: number } | null>(null);

  const cell = 44;

  const vToBg = (v: number) => {
    if (!Number.isFinite(v)) return "bg-zinc-100";
    // map [-1..1] to intensity bucket
    const a = Math.min(1, Math.max(0, Math.abs(v)));
    if (a < 0.2) return "bg-zinc-100";
    if (a < 0.4) return "bg-zinc-200";
    if (a < 0.6) return "bg-zinc-300";
    if (a < 0.8) return "bg-zinc-400";
    return "bg-zinc-500";
  };

  const vToText = (v: number) => {
    if (!Number.isFinite(v)) return "—";
    return v.toFixed(2);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Correlation heatmap</div>
          <div className="mt-1 text-xs text-zinc-500">
            Values range -1 to +1. Stronger absolute value = stronger relationship.
          </div>
        </div>

        {hover ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800">
            <div className="font-semibold">{labels[hover.i]?.title}</div>
            <div className="text-zinc-600">
              vs {labels[hover.j]?.title} • <b>{hover.v.toFixed(2)}</b>
            </div>
          </div>
        ) : (
          <div className="text-xs text-zinc-500">Hover a cell</div>
        )}
      </div>

      <div className="mt-4 overflow-auto rounded-xl border border-zinc-200">
        <div className="min-w-[720px] p-3">
          <div className="grid" style={{ gridTemplateColumns: `220px repeat(${labels.length}, ${cell}px)` }}>
            <div />
            {labels.map((l) => (
              <div key={l.id} className="px-2 pb-2 text-xs font-semibold text-zinc-700">
                {l.title}
              </div>
            ))}

            {labels.map((row, i) => (
              <React.Fragment key={row.id}>
                <div className="pr-2 pt-2 text-xs font-semibold text-zinc-700">{row.title}</div>
                {labels.map((col, j) => {
                  const v = matrix[i]?.[j];
                  return (
                    <div
                      key={col.id}
                      className={`mt-1 flex h-[${cell}px] w-[${cell}px] items-center justify-center rounded-lg border border-zinc-200 text-[11px] font-semibold text-zinc-900 ${vToBg(
                        v
                      )}`}
                      style={{ height: cell, width: cell }}
                      onMouseEnter={() => setHover({ i, j, v })}
                      onMouseLeave={() => setHover(null)}
                      title={`${row.title} vs ${col.title}: ${vToText(v)}`}
                    >
                      {vToText(v)}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            Note: correlation ≠ causation. Use this to shortlist relationships worth investigating.
          </div>
        </div>
      </div>
    </div>
  );
}