// src/lib/econ/fred/state-overlays.ts
export type StateOverlayKey = "unemp_rate" | "hpi" | "fedfunds" | "cpi_us";

export type OverlayDef = {
  key: StateOverlayKey;
  label: string;
  description: string;
  unit: "pct" | "index";
  // series id builder (some are state-specific, some are national)
  seriesId: (stateAbbr: string) => string;
};

// ✅ Good: State unemployment rate exists for state abbreviations as `${STATE}UR` on FRED.
const unempSeriesId = (st: string) => `${st.toUpperCase()}UR`;

// ✅ Good: FHFA HPI All-Transactions exists as `${STATE}STHPI` for states.
const hpiSeriesId = (st: string) => `${st.toUpperCase()}STHPI`;

export const STATE_OVERLAYS: OverlayDef[] = [
  {
    key: "unemp_rate",
    label: "Unemployment rate (state)",
    description: "State unemployment rate from FRED (BLS series mirrored).",
    unit: "pct",
    seriesId: unempSeriesId,
  },
  {
    key: "hpi",
    label: "House Price Index (state FHFA)",
    description: "FHFA All-Transactions House Price Index for each state.",
    unit: "index",
    seriesId: hpiSeriesId,
  },
  {
    key: "fedfunds",
    label: "Fed Funds (US)",
    description: "National policy rate reference overlay.",
    unit: "pct",
    seriesId: () => "FEDFUNDS",
  },
  {
    key: "cpi_us",
    label: "CPI (US, YoY is recommended)",
    description: "National CPI (not state-specific).",
    unit: "index",
    seriesId: () => "CPIAUCSL",
  },
];