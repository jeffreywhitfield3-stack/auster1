// src/components/econ/UsChoropleth.tsx
"use client";

import React, { useMemo, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { scaleQuantize, type ScaleQuantize } from "d3-scale";
import { extent } from "d3-array";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";

// us-atlas ships TopoJSON objects
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import usAtlas from "us-atlas/states-10m.json";

type Props = {
  title?: string;
  unitLabel?: string;
  valueByFips: Record<string, number | null>;
  selectedFips?: Set<string>;
  onToggle?: (fips: string) => void;
  className?: string;
  height?: number; // px
};

const PALETTE: string[] = [
  "#f4f4f5",
  "#e4e4e7",
  "#d4d4d8",
  "#a1a1aa",
  "#71717a",
  "#3f3f46",
  "#18181b",
];

function fmt(n: number, unit?: string) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 0 : abs >= 10 ? 1 : 2;
  const s = n.toLocaleString(undefined, { maximumFractionDigits: digits });
  return unit ? `${s} ${unit}` : s;
}

function normalizeFips2(id: unknown): string | null {
  const n = typeof id === "string" ? Number(id) : typeof id === "number" ? id : NaN;
  if (!Number.isFinite(n)) return null;
  const s = String(Math.trunc(n)).padStart(2, "0");
  return s.length === 2 ? s : s.slice(-2);
}

export default function UsChoropleth({
  title = "US Map",
  unitLabel,
  valueByFips,
  selectedFips,
  onToggle,
  className,
  height = 520,
}: Props) {
  const [hover, setHover] = useState<{
    fips: string;
    name?: string;
    value: number | null;
    x: number;
    y: number;
  } | null>(null);

  const states = useMemo(() => {
    const topo = usAtlas as any;
    const fc = feature(topo, topo.objects.states) as unknown as FeatureCollection<Geometry, GeoJsonProperties>;
    return fc;
  }, []);

  const colorScale: ScaleQuantize<string> = useMemo(() => {
    const vals: number[] = Object.values(valueByFips).filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v)
    );

    // Explicitly type the scale so .range() is string[]
    const sc = scaleQuantize<string>().range(PALETTE);

    if (!vals.length) {
      sc.domain([0, 1]);
      return sc;
    }

    const ex = extent(vals) as [number | undefined, number | undefined];
    const lo = Number.isFinite(ex[0] as number) ? (ex[0] as number) : 0;
    const hiRaw = Number.isFinite(ex[1] as number) ? (ex[1] as number) : lo + 1;
    const hi = hiRaw === lo ? lo + 1 : hiRaw;

    sc.domain([lo, hi]);
    return sc;
  }, [valueByFips]);

  const { pathGen, viewBox } = useMemo(() => {
    const proj = geoAlbersUsa();

    // Fit to a stable viewport
    const w = 980;
    const h = 610;
    proj.fitSize([w, h], states);

    const path = geoPath(proj);
    return { pathGen: path, viewBox: `0 0 ${w} ${h}` };
  }, [states]);

  const legend = useMemo(() => {
    const dom = colorScale.domain();
    const lo = dom[0];
    const hi = dom[1];

    const thresholds: number[] = (colorScale.thresholds?.() ?? []) as number[];
    const range: string[] = colorScale.range() as string[];

    const bins: { color: string; label: string }[] = [];

    if (!thresholds.length) {
      for (const c of range) bins.push({ color: c, label: "" });
      return { bins, lo, hi };
    }

    for (let i = 0; i < range.length; i++) {
      const a = i === 0 ? lo : thresholds[i - 1];
      const b = i === range.length - 1 ? hi : thresholds[i];
      bins.push({
        color: range[i],
        label: `${fmt(a, unitLabel)} → ${fmt(b, unitLabel)}`,
      });
    }

    return { bins, lo, hi };
  }, [colorScale, unitLabel]);

  return (
    <div className={className}>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-900">{title}</div>
            <div className="mt-1 text-xs text-zinc-500">
              Click a state to pin/unpin. Hover to inspect values.
            </div>
          </div>

          {unitLabel ? (
            <div className="text-xs text-zinc-500">
              Unit: <span className="font-semibold text-zinc-700">{unitLabel}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 relative">
          <svg viewBox={viewBox} style={{ width: "100%", height }} role="img" aria-label="US choropleth map">
            <g>
              {states.features.map((f, idx) => {
                const fips = normalizeFips2((f as any).id ?? f.properties?.id);
                if (!fips) return null;

                const v = valueByFips[fips] ?? null;

                const fill: string =
                  typeof v === "number" && Number.isFinite(v) ? colorScale(v) : PALETTE[0];

                const isSelected = selectedFips?.has(fips) ?? false;
                const d = pathGen(f as any) || undefined;

                return (
                  <path
                    key={`${fips}-${idx}`}
                    d={d}
                    fill={fill}
                    stroke={isSelected ? "#111827" : "#ffffff"}
                    strokeWidth={isSelected ? 2 : 1}
                    style={{ cursor: onToggle ? "pointer" : "default" }}
                    onClick={() => onToggle?.(fips)}
                    onMouseMove={(e) => {
                      const name = String((f.properties as any)?.name ?? "");
                      const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setHover({
                        fips,
                        name,
                        value: typeof v === "number" && Number.isFinite(v) ? v : null,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
            </g>
          </svg>

          {hover ? (
            <div
              className="pointer-events-none absolute z-10 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 shadow-lg"
              style={{
                left: Math.min(hover.x + 12, 820),
                top: Math.max(hover.y - 10, 10),
              }}
            >
              <div className="font-semibold text-zinc-900">
                {hover.name || "State"} <span className="font-normal text-zinc-500">({hover.fips})</span>
              </div>
              <div className="mt-1">
                Value:{" "}
                <span className="font-semibold">
                  {hover.value == null ? "—" : fmt(hover.value, unitLabel)}
                </span>
              </div>
              {selectedFips?.has(hover.fips) ? (
                <div className="mt-1 text-[11px] font-semibold text-zinc-700">Pinned</div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-semibold text-zinc-700">Legend</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {legend.bins.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-6 rounded border border-zinc-300"
                  style={{ background: b.color }}
                />
                <span className="text-[11px] text-zinc-600">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">Missing values render as the lightest shade.</div>
        </div>
      </div>
    </div>
  );
}