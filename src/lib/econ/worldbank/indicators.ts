// src/lib/econ/worldbank/indicators.ts
export type WbIndicatorKey =
  | "gdp_current_usd"
  | "gdp_per_capita"
  | "inflation_cpi"
  | "unemployment"
  | "population";

export const WB_INDICATORS: { key: WbIndicatorKey; label: string; code: string; unitHint: string }[] = [
  { key: "gdp_current_usd", label: "GDP (current US$)", code: "NY.GDP.MKTP.CD", unitHint: "$" },
  { key: "gdp_per_capita", label: "GDP per capita (current US$)", code: "NY.GDP.PCAP.CD", unitHint: "$" },
  { key: "inflation_cpi", label: "Inflation (CPI, annual %)", code: "FP.CPI.TOTL.ZG", unitHint: "%" },
  { key: "unemployment", label: "Unemployment (% of labor force)", code: "SL.UEM.TOTL.ZS", unitHint: "%" },
  { key: "population", label: "Population", code: "SP.POP.TOTL", unitHint: "people" },
];