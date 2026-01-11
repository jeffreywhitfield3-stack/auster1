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
  const lab_type = searchParams.get("lab_type");

  try {
    let query = supabase
      .from("workspaces")
      .select(`
        id,
        title,
        description,
        lab_type,
        is_public,
        slug,
        view_count,
        created_at,
        updated_at,
        published_at
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (lab_type) {
      query = query.eq("lab_type", lab_type);
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
