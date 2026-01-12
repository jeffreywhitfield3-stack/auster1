// API Route: Unsubscribe from newsletter
// POST /api/newsletter/unsubscribe

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await supabaseServer();

    // Update subscription
    const { error } = await supabase
      .from("newsletter_subscriptions")
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (error) {
      console.error("Error unsubscribing:", error);
      return NextResponse.json(
        { error: "Failed to unsubscribe" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Unsubscribed successfully",
    });
  } catch (error) {
    console.error("Error in newsletter unsubscribe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET handler for one-click unsubscribe links
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await supabaseServer();

    const { error } = await supabase
      .from("newsletter_subscriptions")
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (error) {
      console.error("Error unsubscribing:", error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/newsletter/unsubscribe?error=true`
      );
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/newsletter/unsubscribe?success=true`
    );
  } catch (error) {
    console.error("Error in newsletter unsubscribe:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/newsletter/unsubscribe?error=true`
    );
  }
}
