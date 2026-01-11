import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  series_id: z.string().min(1).max(50),
  start_year: z.string().optional(),
  end_year: z.string().optional(),
});

type BLSDataPoint = {
  year: string;
  period: string;
  periodName: string;
  value: string;
  footnotes: any[];
};

type BLSResponse = {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: Array<{
      seriesID: string;
      data: BLSDataPoint[];
    }>;
  };
};

async function fetchBLSData(seriesId: string, startYear?: string, endYear?: string) {
  const apiKey = process.env.BLS_API_KEY;
  if (!apiKey) throw new Error("Missing BLS_API_KEY");

  const currentYear = new Date().getFullYear();
  const payload = {
    seriesid: [seriesId],
    startyear: startYear || String(currentYear - 10),
    endyear: endYear || String(currentYear),
    registrationkey: apiKey,
  };

  const response = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`BLS API error: ${response.status}`);
  }

  const data: BLSResponse = await response.json();

  if (data.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS request failed: ${data.message.join(", ")}`);
  }

  return data;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const series_id = searchParams.get("series_id") || "";
  const start_year = searchParams.get("start_year") || undefined;
  const end_year = searchParams.get("end_year") || undefined;

  const parsed = QuerySchema.safeParse({ series_id, start_year, end_year });
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error }, { status: 400 });
  }

  // Auth & usage tracking
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const ipHash = hashIp(getClientIp(req));
  const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
    p_product: "econ",
    p_ip_hash: ipHash,
    p_cost: 1,
  });

  if (usageError) {
    return NextResponse.json({ error: "usage_check_failed", detail: usageError.message }, { status: 502 });
  }

  if (!usage?.allowed) {
    return NextResponse.json(
      {
        error: "usage_limit_exceeded",
        remainingProduct: usage?.remainingProduct ?? 0,
        paid: usage?.paid ?? false,
      },
      { status: 402 }
    );
  }

  try {
    const blsData = await fetchBLSData(series_id, start_year, end_year);
    const seriesData = blsData.Results.series[0];

    if (!seriesData) {
      return NextResponse.json({ error: "series_not_found" }, { status: 404 });
    }

    // Transform data to consistent format
    const observations = seriesData.data.map((point) => {
      // Convert period to date string (M01 = January, etc.)
      const month = point.period.replace("M", "");
      const date = `${point.year}-${month.padStart(2, "0")}-01`;
      const value = point.value === "." ? null : Number(point.value);

      return {
        date,
        year: point.year,
        period: point.period,
        periodName: point.periodName,
        value,
      };
    }).reverse(); // BLS returns newest first, reverse to oldest first

    return NextResponse.json({
      seriesId: series_id,
      observations,
      meta: {
        startYear: start_year || String(new Date().getFullYear() - 10),
        endYear: end_year || String(new Date().getFullYear()),
        dataPoints: observations.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "bls_fetch_failed", detail: String(e?.message || e) },
      { status: 502 }
    );
  }
}
