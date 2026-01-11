// src/lib/econ/map-metrics.ts
export type MapMetricId =
  | "unemployment_level"
  | "unemployment_yoy_pp"
  | "hpi_yoy_pct"
  | "rent_burden_pct"
  | "affordability_index"
  | "income_median"
  | "fmr_2br";

export type MapMetric = {
  id: MapMetricId;
  label: string;
  units: "%" | "pp" | "$" | "index";
  decimals: number;
  source: "fred" | "housing";
  // For FRED-based metrics, we can compute series IDs per state
  fredSeriesId?: (stateAbbr: string) => string | null;
  // How to compute the value from a series (level vs yoy, etc.)
  transform?: "level" | "yoy_pct" | "yoy_pp";
  // Optional: explain / tooltip
  description: string;
};

export const MAP_METRICS: Record<MapMetricId, MapMetric> = {
  unemployment_level: {
    id: "unemployment_level",
    label: "Unemployment rate",
    units: "%",
    decimals: 1,
    source: "fred",
    // State unemployment rate series in FRED typically use:
    // e.g., "MDUR" (Maryland Unemployment Rate)
    // Your existing state dashboard already handles robust lookup, but for the map we’ll use this common pattern.
    // If a state doesn’t match, we’ll return null and it will show as missing.
    fredSeriesId: (abbr) => `${abbr}UR`,
    transform: "level",
    description:
      "Latest unemployment rate by state (FRED). Lower typically indicates stronger labor conditions.",
  },

  unemployment_yoy_pp: {
    id: "unemployment_yoy_pp",
    label: "Unemployment YoY change",
    units: "pp",
    decimals: 1,
    source: "fred",
    fredSeriesId: (abbr) => `${abbr}UR`,
    transform: "yoy_pp",
    description:
      "Change vs ~1 year ago in percentage points (pp). Negative means unemployment improved vs last year.",
  },

  hpi_yoy_pct: {
    id: "hpi_yoy_pct",
    label: "Home price index YoY",
    units: "%",
    decimals: 1,
    source: "fred",
    // FHFA All-Transactions House Price Index by state commonly uses:
    // e.g., "MDSTHPI" (Maryland)
    fredSeriesId: (abbr) => `${abbr}STHPI`,
    transform: "yoy_pct",
    description:
      "YoY % change in FHFA all-transactions HPI. Higher often means hotter housing markets (but less affordable).",
  },

  // Phase 3: derived housing metrics (already computed in your housing screener)
  rent_burden_pct: {
    id: "rent_burden_pct",
    label: "Rent-to-income (proxy)",
    units: "%",
    decimals: 1,
    source: "housing",
    description:
      "Rent burden proxy: (FMR 2BR * 12) / median household income. Lower is generally more affordable.",
  },

  affordability_index: {
    id: "affordability_index",
    label: "Affordability index (synthetic)",
    units: "index",
    decimals: 0,
    source: "housing",
    description:
      "Synthetic affordability score from your screener (higher = more affordable). Uses rent burden + trends + momentum.",
  },

  income_median: {
    id: "income_median",
    label: "Median household income",
    units: "$",
    decimals: 0,
    source: "housing",
    description:
      "Median household income (ACS) as used by your housing screener.",
  },

  fmr_2br: {
    id: "fmr_2br",
    label: "FMR 2BR (rent proxy)",
    units: "$",
    decimals: 0,
    source: "housing",
    description:
      "HUD Fair Market Rent (2BR). Used as a rent proxy in your housing screener.",
  },
};