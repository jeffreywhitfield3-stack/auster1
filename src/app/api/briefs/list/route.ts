// API Route: List published weekly briefs
// GET /api/briefs/list

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = await supabaseServer();

    // Get published briefs
    const { data: briefs, error } = await supabase
      .from("weekly_briefs")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching briefs:", error);
      return NextResponse.json(
        { error: "Failed to fetch briefs" },
        { status: 500 }
      );
    }

    // Get total count
    const { count } = await supabase
      .from("weekly_briefs")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true);

    return NextResponse.json({
      briefs,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in briefs list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
