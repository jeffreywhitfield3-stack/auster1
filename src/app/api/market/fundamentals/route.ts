import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

const Q = z.object({ symbol: z.string().min(1).max(15) });

function asNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "").trim().toUpperCase();

  const parsed = Q.safeParse({ symbol });
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Usage tracking
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const ipHash = hashIp(getClientIp(req));
  const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
    p_product: "econ",
    p_ip_hash: ipHash,
    p_cost: 1,
  });

  if (usageError) return NextResponse.json({ error: "usage_check_failed", detail: usageError.message }, { status: 502 });
  if (!usage?.allowed) {
    return NextResponse.json({ error: "usage_limit_exceeded", remainingProduct: usage?.remainingProduct ?? 0, paid: usage?.paid ?? false }, { status: 402 });
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 500 });
  }

  const sym = parsed.data.symbol;

  // Use FMP "Stable" endpoints (NOT legacy).
  // Docs/examples show:
  // - https://financialmodelingprep.com/stable/income-statement?symbol=AAPL&apikey=...
  // - https://financialmodelingprep.com/stable/profile?symbol=AAPL&apikey=...
  const incomeUrl = `https://financialmodelingprep.com/stable/income-statement?symbol=${encodeURIComponent(
    sym
  )}&apikey=${encodeURIComponent(apiKey)}`;

  const profileUrl = `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(
    sym
  )}&apikey=${encodeURIComponent(apiKey)}`;

  const [incomeRes, profileRes] = await Promise.all([
    fetch(incomeUrl, { cache: "no-store" }),
    fetch(profileUrl, { cache: "no-store" }),
  ]);

  const incomeText = await incomeRes.text();
  const profileText = await profileRes.text();

  if (!incomeRes.ok || !profileRes.ok) {
    return NextResponse.json(
      {
        error: "fetch_failed",
        detail: {
          incomeStatus: incomeRes.status,
          profileStatus: profileRes.status,
          incomeBody: incomeText,
          profileBody: profileText,
        },
      },
      { status: 502 }
    );
  }

  let incomeJson: any;
  let profileJson: any;

  try {
    incomeJson = JSON.parse(incomeText);
    profileJson = JSON.parse(profileText);
  } catch {
    return NextResponse.json(
      { error: "parse_failed", detail: { incomeText, profileText } },
      { status: 502 }
    );
  }

  // Both endpoints typically return arrays.
  const income0 = Array.isArray(incomeJson) ? incomeJson[0] : incomeJson;
  const profile0 = Array.isArray(profileJson) ? profileJson[0] : profileJson;

  const revenue = asNumber(income0?.revenue);

  // Try to compute an effective tax rate from the statement if possible.
  const incomeBeforeTax = asNumber(income0?.incomeBeforeTax);
  const incomeTaxExpense = asNumber(income0?.incomeTaxExpense);
  const taxRate =
    incomeBeforeTax && incomeTaxExpense !== null && incomeBeforeTax !== 0
      ? Math.max(0, Math.min(0.6, incomeTaxExpense / incomeBeforeTax))
      : null;

  // Shares: prefer explicit field if present, otherwise infer shares = marketCap / price.
  const sharesOutstandingDirect =
    asNumber(profile0?.sharesOutstanding) ??
    asNumber(profile0?.shares) ??
    asNumber(profile0?.weightedAverageShsOut);

  const price = asNumber(profile0?.price);
  const marketCap = asNumber(profile0?.marketCap);

  const sharesOutstandingInferred =
    !sharesOutstandingDirect && price && marketCap && price !== 0
      ? marketCap / price
      : null;

  const sharesOutstanding = sharesOutstandingDirect ?? sharesOutstandingInferred;

  return NextResponse.json({
    symbol: sym,
    revenue, // raw currency units from FMP; your UI can convert to $M if desired
    taxRate,
    sharesOutstanding,
    price,
    marketCap,
    source: "fmp_stable",
  });
}
