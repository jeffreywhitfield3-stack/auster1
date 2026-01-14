import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const product = searchParams.get("product");

  try {
    let query = supabase
      .from("lab_workspaces")
      .select(`
        id,
        name,
        description,
        product,
        is_public,
        created_at,
        updated_at,
        last_accessed_at
      `)
      .eq("user_id", user.id)
      .order("last_accessed_at", { ascending: false });

    if (product) {
      query = query.eq("product", product);
    }

    const { data: workspaces, error } = await query;

    if (error) {
      return NextResponse.json({ error: "fetch_failed", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspaces });
  } catch (e: any) {
    return NextResponse.json({ error: "internal_error", detail: String(e?.message || e) }, { status: 500 });
  }
}
