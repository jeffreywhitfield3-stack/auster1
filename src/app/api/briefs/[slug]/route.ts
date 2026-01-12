// API Route: Get single weekly brief by slug
// GET /api/briefs/[slug]

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const supabase = await createServerClient();

    // Get brief
    const { data: brief, error } = await supabase
      .from("weekly_briefs")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error || !brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    // Increment page views
    await supabase
      .from("weekly_briefs")
      .update({
        page_views: (brief.page_views || 0) + 1,
      })
      .eq("id", brief.id);

    return NextResponse.json({ brief });
  } catch (error) {
    console.error("Error fetching brief:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
