export type MetricKey =
  | "population"
  | "median_income"
  | "poverty_rate"
  | "bachelors_plus"
  | "median_rent";

export const METRICS: { key: MetricKey; label: string; unit: "count" | "usd" | "pct" }[] = [
  { key: "median_income", label: "Median income", unit: "usd" },
  { key: "median_rent", label: "Median rent", unit: "usd" },
  { key: "poverty_rate", label: "Poverty rate", unit: "pct" },
  { key: "bachelors_plus", label: "Bachelor’s+ %", unit: "pct" },
  { key: "population", label: "Population", unit: "count" },
];

export function fmtMetric(unit: "count" | "usd" | "pct" | "index" | string, v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";

  if (unit === "usd") {
    return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  if (unit === "pct") {
    return `${v.toFixed(1)}%`;
  }
  if (unit === "count") {
    return Math.round(v).toLocaleString();
  }
  if (unit === "index") {
    return v.toFixed(1);
  }
  return String(v);
}