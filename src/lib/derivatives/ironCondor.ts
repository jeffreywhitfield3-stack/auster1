// src/lib/derivatives/ironCondor.ts
export type ChainLeg = {
  strike: number;
  bid: number | null;
  ask: number | null;
  volume?: number | null;
  open_interest?: number | null;
  implied_volatility?: number | null; // decimal preferred (0.25)
  delta?: number | null;
  theta?: number | null;
};

export type Condor = {
  putLong: number;
  putShort: number;
  callShort: number;
  callLong: number;

  credit: number; // per share
  maxProfit: number; // per share
  maxLoss: number; // per share
  returnOnRisk: number; // credit/maxLoss

  lowerBE: number;
  upperBE: number;

  pop: number | null;
};

export type BuildParams = {
  symbol: string;
  expiration: string;
  underlying: number;
  asOf: string | null;

  calls: ChainLeg[];
  puts: ChainLeg[];

  topN: number;
  rankBy: "returnOnRisk" | "pop" | "credit";

  filters: {
    minOpenInterest: number;
    minVolume: number;
    maxSpreadPct: number;
  };
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function mid(bid: number | null, ask: number | null) {
  if (bid === null || ask === null) return null;
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) return null;
  if (bid < 0 || ask < 0) return null;
  if (ask === 0 && bid === 0) return 0;
  return (bid + ask) / 2;
}

function spreadPct(bid: number | null, ask: number | null) {
  const m = mid(bid, ask);
  if (m === null || m <= 0) return Infinity;
  if (bid === null || ask === null) return Infinity;
  return (ask - bid) / m;
}

function cleanLegs(legs: ChainLeg[], f: BuildParams["filters"]) {
  return legs
    .map((x) => ({
      ...x,
      strike: Number(x.strike),
      bid: x.bid === null ? null : Number(x.bid),
      ask: x.ask === null ? null : Number(x.ask),
      volume: x.volume == null ? null : Number(x.volume),
      open_interest: x.open_interest == null ? null : Number(x.open_interest),
      implied_volatility: x.implied_volatility == null ? null : Number(x.implied_volatility),
      delta: x.delta == null ? null : Number(x.delta),
      theta: x.theta == null ? null : Number(x.theta),
    }))
    .filter((x) => Number.isFinite(x.strike) && x.strike > 0)
    .filter((x) => x.bid !== null && x.ask !== null && x.ask >= x.bid)
    .filter((x) => spreadPct(x.bid, x.ask) <= f.maxSpreadPct)
    .filter((x) => (x.open_interest ?? 0) >= f.minOpenInterest)
    .filter((x) => (x.volume ?? 0) >= f.minVolume);
}

function parseExpiryToT(expiration: string) {
  // Expect YYYY-MM-DD. Treat expiration as end-of-day ET.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiration);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const exp = new Date(Date.UTC(y, mo, d, 21, 0, 0)); // ~4pm ET-ish in UTC (rough)
  const now = new Date();
  const dtMs = exp.getTime() - now.getTime();
  const dtDays = dtMs / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(dtDays)) return null;
  return clamp(dtDays / 365, 1 / 3650, 5); // avoid zero
}

// Normal CDF approximation (good enough for ranking)
function normCdf(x: number) {
  // Abramowitz & Stegun approximation via erf
  return 0.5 * (1 + erf(x / Math.SQRT2));
}
function erf(x: number) {
  // Numerical approximation
  const sign = x >= 0 ? 1 : -1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}

function estimateIv(underlying: number, calls: ChainLeg[], puts: ChainLeg[]) {
  // Prefer near-the-money options’ IV; fall back to median of available IVs.
  const all = [...calls, ...puts].filter((l) => l.implied_volatility != null && Number.isFinite(l.implied_volatility!));
  if (!all.length) return null;

  const near = all
    .map((l) => ({ l, dist: Math.abs(l.strike - underlying) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 12)
    .map((x) => x.l.implied_volatility!)
    .filter((v) => v > 0 && v < 5);

  const pick = near.length ? near : all.map((l) => l.implied_volatility!).filter((v) => v > 0 && v < 5);
  if (!pick.length) return null;

  pick.sort((a, b) => a - b);
  return pick[Math.floor(pick.length / 2)];
}

function popBetweenBreakevens(spot: number, lo: number, hi: number, iv: number, tYears: number) {
  // Lognormal: ln(S_T/S0) ~ N(-0.5*s^2*T, s^2*T) under r=0 (rough)
  // POP = P(lo < S_T < hi)
  if (!(spot > 0 && lo > 0 && hi > 0 && iv > 0 && tYears > 0)) return null;
  if (hi <= lo) return null;

  const s = iv;
  const mu = -0.5 * s * s * tYears;
  const sig = s * Math.sqrt(tYears);

  const z = (k: number) => (Math.log(k / spot) - mu) / sig;

  const p = normCdf(z(hi)) - normCdf(z(lo));
  return clamp(p, 0, 1);
}

export function buildIronCondors(p: BuildParams): {
  symbol: string;
  expiration: string;
  underlying: number;
  asOf: string | null;
  condors: Condor[];
  notes: string[];
} {
  const notes: string[] = [];

  const spot = Number(p.underlying);
  if (!Number.isFinite(spot) || spot <= 0) {
    return { symbol: p.symbol, expiration: p.expiration, underlying: spot, asOf: p.asOf, condors: [], notes: ["Invalid underlying price"] };
  }

  const calls = cleanLegs(p.calls, p.filters).sort((a, b) => a.strike - b.strike);
  const puts = cleanLegs(p.puts, p.filters).sort((a, b) => a.strike - b.strike);

  if (!calls.length || !puts.length) {
    notes.push("No liquid options after filters. Try lowering min OI/volume or increasing max spread %.");
    return { symbol: p.symbol, expiration: p.expiration, underlying: spot, asOf: p.asOf, condors: [], notes };
  }

  const t = parseExpiryToT(p.expiration);
  const iv = estimateIv(spot, calls, puts);
  if (!t) notes.push("Could not parse expiration into time-to-expiry; POP may be missing.");
  if (!iv) notes.push("IV not available; POP may be missing.");

  // Candidate shorts: slightly OTM (puts below spot, calls above spot)
  const putShorts = puts.filter((x) => x.strike < spot).slice(-40); // closest OTM puts
  const callShorts = calls.filter((x) => x.strike > spot).slice(0, 40); // closest OTM calls

  // For each short, choose longs further OTM to form spreads (width constraint)
  const maxWidth = spot * 0.25; // heuristic cap (adjust later)
  const condors: Condor[] = [];

  for (const ps of putShorts) {
    const psBid = ps.bid ?? 0;
    // Long put must be lower strike
    const putLongs = puts
      .filter((pl) => pl.strike < ps.strike && ps.strike - pl.strike > 0 && ps.strike - pl.strike <= maxWidth)
      .slice(-18);

    for (const pl of putLongs) {
      const plAsk = pl.ask ?? 0;
      const putCredit = psBid - plAsk;
      if (!Number.isFinite(putCredit) || putCredit <= 0) continue;

      const putWidth = ps.strike - pl.strike;

      for (const cs of callShorts) {
        const csBid = cs.bid ?? 0;
        // Long call must be higher strike
        const callLongs = calls
          .filter((cl) => cl.strike > cs.strike && cl.strike - cs.strike > 0 && cl.strike - cs.strike <= maxWidth)
          .slice(0, 18);

        for (const cl of callLongs) {
          const clAsk = cl.ask ?? 0;
          const callCredit = csBid - clAsk;
          if (!Number.isFinite(callCredit) || callCredit <= 0) continue;

          const callWidth = cl.strike - cs.strike;

          const credit = putCredit + callCredit; // per share
          if (!Number.isFinite(credit) || credit <= 0) continue;

          const maxProfit = credit;

          // Conservative: max loss uses the wider side
          const width = Math.max(putWidth, callWidth);
          const maxLoss = width - credit;
          if (!Number.isFinite(maxLoss) || maxLoss <= 0) continue;

          const lowerBE = ps.strike - credit;
          const upperBE = cs.strike + credit;

          const pop =
            t && iv
              ? popBetweenBreakevens(spot, lowerBE, upperBE, iv, t)
              : null;

          const ror = credit / maxLoss;

          condors.push({
            putLong: pl.strike,
            putShort: ps.strike,
            callShort: cs.strike,
            callLong: cl.strike,
            credit,
            maxProfit,
            maxLoss,
            returnOnRisk: ror,
            lowerBE,
            upperBE,
            pop,
          });
        }
      }
    }
  }

  if (!condors.length) {
    notes.push("No viable condors found given the filters + quote quality. Try relaxing filters.");
    return { symbol: p.symbol, expiration: p.expiration, underlying: spot, asOf: p.asOf, condors: [], notes };
  }

  // Rank
  const rankBy = p.rankBy;
  condors.sort((a, b) => {
    if (rankBy === "credit") return (b.credit ?? 0) - (a.credit ?? 0);
    if (rankBy === "pop") return (b.pop ?? -1) - (a.pop ?? -1);
    return (b.returnOnRisk ?? 0) - (a.returnOnRisk ?? 0);
  });

  const top = condors.slice(0, clamp(p.topN, 1, 300));

  return {
    symbol: p.symbol,
    expiration: p.expiration,
    underlying: spot,
    asOf: p.asOf,
    condors: top,
    notes,
  };
}