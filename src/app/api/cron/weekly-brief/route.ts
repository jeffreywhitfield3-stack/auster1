// API Route: Automated weekly brief generation (Vercel Cron)
// This runs every Sunday at 6:00 PM ET (18:00)
// Cron expression: "0 18 * * 0"

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const maxDuration = 300; // 5 minutes max execution time
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request from Vercel
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await supabaseServer();

    // Check if a brief has already been sent this week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Get Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const { data: existingBrief } = await supabase
      .from("weekly_briefs")
      .select("id")
      .gte("sent_at", startOfWeek.toISOString())
      .eq("is_sent", true)
      .single();

    if (existingBrief) {
      return NextResponse.json({
        message: "Brief already sent this week",
        skipped: true,
      });
    }

    // TODO: Implement AI-powered brief generation
    // For now, this will just check if an admin has already created a brief manually
    // In the future, this could:
    // 1. Scan derivatives anomalies from /api/derivatives/anomalies
    // 2. Check economic calendar for upcoming events
    // 3. Analyze volatility term structures
    // 4. Generate trade ideas using AI
    // 5. Create and publish the brief automatically

    const { data: unpublishedBriefs } = await supabase
      .from("weekly_briefs")
      .select("*")
      .eq("is_published", true)
      .eq("is_sent", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!unpublishedBriefs || unpublishedBriefs.length === 0) {
      return NextResponse.json({
        message: "No unpublished briefs to send",
        skipped: true,
      });
    }

    const brief = unpublishedBriefs[0];

    // Trigger the email sending by calling the publish API
    // (We can't just import and call the function because it's a route handler)
    const publishResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/briefs/send-existing`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          briefId: brief.id,
        }),
      }
    );

    if (!publishResponse.ok) {
      throw new Error("Failed to send brief emails");
    }

    const publishData = await publishResponse.json();

    return NextResponse.json({
      message: "Weekly brief sent successfully",
      briefId: brief.id,
      emailsSent: publishData.emailsSent,
      totalSubscribers: publishData.totalSubscribers,
    });
  } catch (error) {
    console.error("Error in weekly brief cron:", error);
    return NextResponse.json(
      {
        error: "Failed to send weekly brief",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
