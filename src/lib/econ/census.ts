// src/lib/econ/census.ts
export type CensusStateRow = {
  fips: string; // "24"
  name: string; // "Maryland"
  population: number | null;
  medianIncome: number | null;
  povertyRate: number | null; // %
  bachelorsPlus: number | null; // %
  medianRent: number | null;
};

export type CensusMetroRow = {
  cbsa: string; // "12580"
  name: string; // "Baltimore-Columbia-Towson, MD"
  population: number | null;
  medianIncome: number | null;
  povertyRate: number | null;
  bachelorsPlus: number | null;
  medianRent: number | null;
};

function num(x: any): number | null {
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
}

function pct(numer: number | null, denom: number | null): number | null {
  if (!numer || !denom || denom <= 0) return null;
  return (numer / denom) * 100;
}

// ACS 1-year (most recent available) — great for “now” dashboards.
// If you want more coverage for smaller metros later, we can switch to ACS 5-year.
export function parseAcsState(rows: any[][]): CensusStateRow[] {
  // First row = headers
  const body = rows.slice(1);

  return body.map((r) => {
    // Variables
    // B01001_001E = total population
    // B19013_001E = median household income
    // S1701_C03_001E = poverty percent (NOTE: "S" tables are easier, but not always consistent)
    // For reliability, we compute poverty % from:
    // B17001_001E = total for whom poverty status is determined
    // B17001_002E = below poverty
    //
    // Education:
    // B15003_001E total 25+
    // B15003_022E..B15003_025E bachelor+ (bachelor, master, prof, phd)
    //
    // Rent:
    // B25064_001E median gross rent

    const [
      pop,
      income,
      povTotal,
      povBelow,
      eduTotal,
      eduBach,
      eduMast,
      eduProf,
      eduPhd,
      medRent,
      name,
      state,
    ] = r;

    const population = num(pop);
    const medianIncome = num(income);
    const povertyRate = pct(num(povBelow), num(povTotal));

    const bachelorsPlus =
      pct(
        (num(eduBach) ?? 0) + (num(eduMast) ?? 0) + (num(eduProf) ?? 0) + (num(eduPhd) ?? 0),
        num(eduTotal)
      ) ?? null;

    const medianRent = num(medRent);

    return {
      fips: String(state),
      name: String(name),
      population,
      medianIncome,
      povertyRate,
      bachelorsPlus,
      medianRent,
    };
  });
}

export function parseAcsMetro(rows: any[][]): CensusMetroRow[] {
  const body = rows.slice(1);

  return body.map((r) => {
    const [
      pop,
      income,
      povTotal,
      povBelow,
      eduTotal,
      eduBach,
      eduMast,
      eduProf,
      eduPhd,
      medRent,
      name,
      cbsa,
    ] = r;

    const population = num(pop);
    const medianIncome = num(income);
    const povertyRate = pct(num(povBelow), num(povTotal));
    const bachelorsPlus =
      pct(
        (num(eduBach) ?? 0) + (num(eduMast) ?? 0) + (num(eduProf) ?? 0) + (num(eduPhd) ?? 0),
        num(eduTotal)
      ) ?? null;
    const medianRent = num(medRent);

    return {
      cbsa: String(cbsa),
      name: String(name),
      population,
      medianIncome,
      povertyRate,
      bachelorsPlus,
      medianRent,
    };
  });
}