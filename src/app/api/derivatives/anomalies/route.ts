import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";

type AggData = {
  v: number; // volume
  vw: number; // volume weighted average price
  o: number; // open
  c: number; // close
  h: number; // high
  l: number; // low
  t: number; // timestamp
  n: number; // number of transactions
};

type AggResponse = {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results: AggData[];
  status: string;
  request_id: string;
  count: number;
};

/**
 * Anomaly Detection based on Polygon/Massive methodology
 *
 * Detects unusual trading volume spikes using z-score analysis:
 * z_score = (current_trades - avg_trades) / std_trades
 *
 * Flags anomalies where z-score > 3 (99.7% confidence interval)
 */

interface AnomalyResult {
  ticker: string;
  date: string;
  transactions: number;
  avgTransactions: number;
  stdTransactions: number;
  zScore: number;
  priceChange: number;
  priceChangePct: number;
  volume: number;
  close: number;
  anomalyType: "high_volume" | "extreme_volume";
}

function calculateStats(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);

  return { mean, std };
}

function detectAnomaly(currentTransactions: number, historicalTransactions: number[]): { zScore: number; isAnomaly: boolean } {
  const { mean, std } = calculateStats(historicalTransactions);

  if (std === 0) return { zScore: 0, isAnomaly: false };

  const zScore = (currentTransactions - mean) / std;

  // Threshold: z-score > 3 (99.7% confidence)
  const isAnomaly = zScore > 3;

  return { zScore, isAnomaly };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = (searchParams.get("ticker") || "").trim().toUpperCase();
    const lookbackDays = Math.min(Number(searchParams.get("lookback") || "30"), 90);

    if (!ticker) {
      return NextResponse.json({ error: "missing_ticker" }, { status: 400 });
    }

    // Usage tracking
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const ipHash = hashIp(getClientIp(req));
    const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
      p_product: "derivatives",
      p_ip_hash: ipHash,
      p_cost: 2, // Anomaly detection is moderately expensive
    });

    if (usageError) {
      return NextResponse.json({ error: "usage_check_failed", detail: usageError.message }, { status: 502 });
    }

    if (!usage?.allowed) {
      return NextResponse.json(
        {
          error: "usage_limit_exceeded",
          remainingProduct: usage?.remainingProduct ?? 0,
          paid: usage?.paid ?? false
        },
        { status: 402 }
      );
    }

    // Fetch historical data from Polygon/Massive
    const apiKey = process.env.MASSIVE_API_KEY || process.env.POLYGON_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "missing_api_key", detail: "MASSIVE_API_KEY not configured" }, { status: 500 });
    }

    const baseUrl = process.env.MASSIVE_BASE_URL || "https://api.polygon.io";
    const useBearerAuth = process.env.MASSIVE_USE_BEARER_AUTH === "true";

    // Get data for last N days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const from = startDate.toISOString().split('T')[0];
    const to = endDate.toISOString().split('T')[0];

    const url = `${baseUrl}/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}`;
    const fetchUrl = useBearerAuth ? url : `${url}?apiKey=${apiKey}`;

    const headers: HeadersInit = useBearerAuth
      ? { Authorization: `Bearer ${apiKey}` }
      : {};

    const response = await fetch(fetchUrl, { headers });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "polygon_api_failed", detail: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = await response.json() as AggResponse;

    if (!data.results || data.results.length < 6) {
      return NextResponse.json(
        { error: "insufficient_data", detail: "Need at least 6 days of data for anomaly detection" },
        { status: 400 }
      );
    }

    // Analyze for anomalies using rolling 5-day window
    const anomalies: AnomalyResult[] = [];
    const results = data.results.sort((a, b) => a.t - b.t); // Sort by timestamp

    for (let i = 5; i < results.length; i++) {
      const current = results[i];
      const previous5Days = results.slice(i - 5, i);

      const historicalTransactions = previous5Days.map(d => d.n);
      const { zScore, isAnomaly } = detectAnomaly(current.n, historicalTransactions);

      if (isAnomaly) {
        const { mean: avgTransactions, std: stdTransactions } = calculateStats(historicalTransactions);
        const priceChange = current.c - current.o;
        const priceChangePct = (priceChange / current.o) * 100;

        anomalies.push({
          ticker,
          date: new Date(current.t).toISOString().split('T')[0],
          transactions: current.n,
          avgTransactions: Math.round(avgTransactions),
          stdTransactions: Math.round(stdTransactions * 100) / 100,
          zScore: Math.round(zScore * 100) / 100,
          priceChange: Math.round(priceChange * 100) / 100,
          priceChangePct: Math.round(priceChangePct * 100) / 100,
          volume: current.v,
          close: current.c,
          anomalyType: zScore > 10 ? "extreme_volume" : "high_volume"
        });
      }
    }

    // Sort by z-score (highest anomalies first)
    anomalies.sort((a, b) => b.zScore - a.zScore);

    return NextResponse.json({
      ticker,
      lookbackDays,
      anomaliesFound: anomalies.length,
      anomalies,
      methodology: {
        description: "Detects unusual trading volume using z-score analysis",
        threshold: "z-score > 3 standard deviations",
        window: "5-day rolling average",
        confidence: "99.7% (3σ)"
      }
    });

  } catch (e: any) {
    return NextResponse.json(
      { error: "anomaly_detection_failed", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
