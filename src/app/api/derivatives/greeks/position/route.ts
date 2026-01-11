import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LegSchema = z.object({
  type: z.enum(["call", "put"]),
  strike: z.number(),
  expiry: z.string(),
  quantity: z.number(),
  price: z.number().optional(),
});

const QuerySchema = z.object({
  symbol: z.string().min(1).max(10),
  legs: z.array(LegSchema),
});

// Black-Scholes Greeks calculations
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function calculateD1D2(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): [number, number] {
  const d1 =
    (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return [d1, d2];
}

interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

function calculateGreeks(
  optionType: "call" | "put",
  S: number, // Current stock price
  K: number, // Strike price
  T: number, // Time to expiration (years)
  r: number, // Risk-free rate
  sigma: number, // Implied volatility
  quantity: number
): Greeks {
  if (T <= 0) {
    // Expired option
    return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const [d1, d2] = calculateD1D2(S, K, T, r, sigma);

  let delta: number;
  let theta: number;
  let rho: number;

  if (optionType === "call") {
    delta = normalCDF(d1);
    theta =
      (-S * normalPDF(d1) * sigma) / (2 * Math.sqrt(T)) -
      r * K * Math.exp(-r * T) * normalCDF(d2);
    rho = K * T * Math.exp(-r * T) * normalCDF(d2);
  } else {
    delta = normalCDF(d1) - 1;
    theta =
      (-S * normalPDF(d1) * sigma) / (2 * Math.sqrt(T)) +
      r * K * Math.exp(-r * T) * normalCDF(-d2);
    rho = -K * T * Math.exp(-r * T) * normalCDF(-d2);
  }

  const gamma = normalPDF(d1) / (S * sigma * Math.sqrt(T));
  const vega = S * normalPDF(d1) * Math.sqrt(T);

  // Scale by quantity and convert to per-contract basis
  return {
    delta: delta * quantity * 100,
    gamma: gamma * quantity * 100,
    theta: (theta / 365) * quantity, // Per day
    vega: (vega / 100) * quantity, // Per 1% IV change
    rho: (rho / 100) * quantity, // Per 1% interest rate change
  };
}

function getTimeToExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return Math.max(0, days / 365); // Convert to years
}

export async function POST(req: Request) {
  // Auth & usage tracking
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const ipHash = hashIp(getClientIp(req));
  const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
    p_product: "derivatives",
    p_ip_hash: ipHash,
    p_cost: 1,
  });

  if (usageError) {
    return NextResponse.json({ error: "usage_check_failed" }, { status: 502 });
  }

  if (!usage?.allowed) {
    return NextResponse.json(
      {
        error: "usage_limit_exceeded",
        remainingProduct: usage?.remainingProduct ?? 0,
      },
      { status: 402 }
    );
  }

  try {
    const body = await req.json();
    const parsed = QuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "bad_request", details: parsed.error }, { status: 400 });
    }

    const { symbol, legs } = parsed.data;

    // Fetch current stock price from Polygon (you'll need this)
    // For now, using a placeholder - integrate with your existing Polygon setup
    const polygonKey = process.env.POLYGON_API_KEY;
    if (!polygonKey) {
      return NextResponse.json({ error: "polygon_key_missing" }, { status: 500 });
    }

    const quoteRes = await fetch(
      `https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${polygonKey}`
    );

    if (!quoteRes.ok) {
      return NextResponse.json({ error: "failed_to_fetch_quote" }, { status: 502 });
    }

    const quoteData = await quoteRes.json();
    const currentPrice = quoteData.results?.p || 100; // Fallback

    // Risk-free rate (approximate - could fetch from FRED)
    const riskFreeRate = 0.045; // 4.5%

    // Calculate Greeks for each leg
    const legsWithGreeks = legs.map((leg) => {
      const T = getTimeToExpiry(leg.expiry);

      // Estimated IV - in production, fetch from Polygon options endpoint
      const estimatedIV = 0.30; // 30% placeholder

      const greeks = calculateGreeks(
        leg.type,
        currentPrice,
        leg.strike,
        T,
        riskFreeRate,
        estimatedIV,
        leg.quantity
      );

      return {
        ...leg,
        greeks,
        timeToExpiry: T,
        daysToExpiry: Math.round(T * 365),
      };
    });

    // Aggregate portfolio Greeks
    const portfolioGreeks = legsWithGreeks.reduce(
      (acc, leg) => ({
        delta: acc.delta + leg.greeks.delta,
        gamma: acc.gamma + leg.greeks.gamma,
        theta: acc.theta + leg.greeks.theta,
        vega: acc.vega + leg.greeks.vega,
        rho: acc.rho + leg.greeks.rho,
      }),
      { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
    );

    return NextResponse.json({
      symbol,
      currentPrice,
      riskFreeRate,
      legs: legsWithGreeks,
      portfolio: portfolioGreeks,
      hedging: {
        deltaShares: -Math.round(portfolioGreeks.delta / 100),
        isDeltaNeutral: Math.abs(portfolioGreeks.delta) < 10,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "calculation_failed", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
