import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";

const Q = z.object({
  product: z.string().min(1).max(64),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Q.safeParse({ product: (url.searchParams.get("product") || "").trim() });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const product = parsed.data.product;
  const ipHash = hashIp(getClientIp(req));

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    // Not authed: treat as not allowed (forces login to count usage)
    return NextResponse.json({ allowed: false, remainingProduct: 0, remainingTotal: 0, reason: "not_authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("consume_usage", {
    p_product: product,
    p_ip_hash: ipHash,
    p_cost: 0, // ✅ peek
  });

  if (error) {
    return NextResponse.json({ error: "peek_failed", detail: error.message }, { status: 502 });
  }

  return NextResponse.json(data);
}