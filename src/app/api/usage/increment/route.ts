import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";

const Body = z.object({
  product: z.string().min(1).max(64),
  cost: z.number().int().min(1).max(10).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const product = parsed.data.product;
  const cost = parsed.data.cost ?? 1;

  const ipHash = hashIp(getClientIp(req));

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ allowed: false, reason: "not_authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("consume_usage", {
    p_product: product,
    p_ip_hash: ipHash,
    p_cost: cost, // ✅ consume
  });

  if (error) {
    return NextResponse.json({ error: "increment_failed", detail: error.message }, { status: 502 });
  }

  // If not allowed, return 402 so UI can show upgrade modal
  if (!data?.allowed) {
    return NextResponse.json(data, { status: 402 });
  }

  return NextResponse.json(data);
}