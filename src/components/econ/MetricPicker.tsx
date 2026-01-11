"use client";

import { METRICS, type MetricKey } from "@/lib/econ/metrics";

type OverlayKey = "census_metric" | "unemp_rate" | "hpi";

export default function MetricPicker(props: {
  mode: OverlayKey;
  onModeChange: (m: OverlayKey) => void;

  metric: MetricKey;
  onMetricChange: (k: MetricKey) => void;

  overlay: "unemp_rate" | "hpi";
  onOverlayChange: (k: "unemp_rate" | "hpi") => void;

  disabled?: boolean;
}) {
  const { mode, onModeChange, metric, onMetricChange, overlay, onOverlayChange, disabled } = props;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Map controls</div>
          <div className="mt-1 text-xs text-zinc-500">
            Choose a metric. Hover to inspect; click states to pin & compare.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as OverlayKey)}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            disabled={disabled}
          >
            <option value="census_metric">Census (ACS) metric</option>
            <option value="unemp_rate">FRED overlay: Unemployment</option>
            <option value="hpi">FRED overlay: House Price Index</option>
          </select>

          {mode === "census_metric" ? (
            <select
              value={metric}
              onChange={(e) => onMetricChange(e.target.value as MetricKey)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
              disabled={disabled}
            >
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="hidden" />
          )}

          {/* overlay quick toggle (still useful even though mode drives it) */}
          <div className="hidden md:flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onOverlayChange("unemp_rate")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                overlay === "unemp_rate" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-700 hover:bg-white"
              }`}
            >
              Unemployment
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onOverlayChange("hpi")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                overlay === "hpi" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-700 hover:bg-white"
              }`}
            >
              HPI
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-zinc-600 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="font-semibold text-zinc-900">How to use</div>
          <div className="mt-1 leading-5">
            Pick a metric → scan clusters → click states to pin → Compare tab generates the “shareable truth table”.
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="font-semibold text-zinc-900">Why the map matters</div>
          <div className="mt-1 leading-5">
            Humans understand distributions fast. Choropleths reveal regional structure that tables hide.
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="font-semibold text-zinc-900">Best practice</div>
          <div className="mt-1 leading-5">
            Pin 5–15 states. Use the correlation heatmap to identify “moves together” relationships.
          </div>
        </div>
      </div>
    </div>
  );
}