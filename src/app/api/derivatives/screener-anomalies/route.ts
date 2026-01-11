import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";

/**
 * Anomaly Screener - Scans multiple tickers for volume anomalies
 *
 * This is the retail-friendly version that screens a watchlist of popular tickers
 * and returns the most anomalous stocks by trading activity.
 */

const POPULAR_TICKERS = [
  // Mega-cap tech
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
  // Financial
  "JPM", "BAC", "GS", "WFC",
  // Consumer
  "DIS", "NKE", "SBUX", "MCD",
  // Healthcare
  "JNJ", "UNH", "PFE",
  // Meme stocks / high retail interest
  "AMC", "GME", "PLTR", "RIVN",
  // ETFs
  "SPY", "QQQ", "IWM"
];

type AnomalyData = {
  ticker: string;
  date: string;
  transactions: number;
  avgTransactions: number;
  zScore: number;
  priceChangePct: number;
  volume: number;
  close: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tickers = (body.tickers as string[]) || POPULAR_TICKERS;
    const minZScore = Number(body.minZScore || 3);
    const maxResults = Math.min(Number(body.maxResults || 50), 100);

    // Usage tracking - expensive operation
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const ipHash = hashIp(getClientIp(req));
    const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
      p_product: "derivatives",
      p_ip_hash: ipHash,
      p_cost: 5, // Screening multiple tickers is expensive
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

    // Fetch anomalies for each ticker (in parallel, but rate-limited)
    const allAnomalies: AnomalyData[] = [];
    const batchSize = 5; // Process 5 tickers at a time to avoid rate limits

    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);

      const promises = batch.map(async (ticker) => {
        try {
          const url = `${req.url.replace('/screener-anomalies', '/anomalies')}?ticker=${ticker}&lookback=30`;
          const baseUrl = new URL(url).origin;
          const fullUrl = `${baseUrl}/api/derivatives/anomalies?ticker=${ticker}&lookback=30`;

          const response = await fetch(fullUrl, {
            headers: {
              Cookie: req.headers.get('cookie') || ''
            }
          });

          if (!response.ok) return null;

          const data = await response.json();

          // Get the most recent anomaly for this ticker
          if (data.anomalies && data.anomalies.length > 0) {
            return data.anomalies[0]; // Most recent anomaly
          }

          return null;
        } catch (e) {
          console.error(`Failed to fetch anomalies for ${ticker}:`, e);
          return null;
        }
      });

      const results = await Promise.all(promises);
      const validResults = results.filter((r): r is AnomalyData => r !== null);
      allAnomalies.push(...validResults);

      // Small delay between batches to respect rate limits
      if (i + batchSize < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Filter by min z-score and sort by z-score descending
    const filtered = allAnomalies
      .filter(a => a.zScore >= minZScore)
      .sort((a, b) => b.zScore - a.zScore)
      .slice(0, maxResults);

    return NextResponse.json({
      tickersScanned: tickers.length,
      anomaliesFound: filtered.length,
      minZScore,
      anomalies: filtered,
      timestamp: new Date().toISOString()
    });

  } catch (e: any) {
    return NextResponse.json(
      { error: "screener_failed", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
