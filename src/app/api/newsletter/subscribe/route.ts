// API Route: Subscribe to newsletter
// POST /api/newsletter/subscribe

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { resend, EMAIL_TEMPLATES, replaceTemplateVars } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, preferences, source, utmSource, utmCampaign } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get authenticated user (if logged in)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from("newsletter_subscriptions")
      .select("*")
      .eq("email", email)
      .single();

    if (existing) {
      // Reactivate if previously unsubscribed
      if (!existing.is_active) {
        const { error: updateError } = await supabase
          .from("newsletter_subscriptions")
          .update({
            is_active: true,
            unsubscribed_at: null,
            ...preferences,
          })
          .eq("email", email);

        if (updateError) {
          console.error("Error reactivating subscription:", updateError);
          return NextResponse.json(
            { error: "Failed to reactivate subscription" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: "Subscription reactivated successfully",
          alreadySubscribed: false,
        });
      }

      return NextResponse.json({
        message: "Already subscribed",
        alreadySubscribed: true,
      });
    }

    // Create new subscription
    const { error: insertError } = await supabase
      .from("newsletter_subscriptions")
      .insert({
        user_id: user?.id,
        email,
        subscription_source: source || "direct",
        utm_source: utmSource,
        utm_campaign: utmCampaign,
        ...preferences,
      });

    if (insertError) {
      console.error("Error creating subscription:", insertError);
      return NextResponse.json(
        { error: "Failed to subscribe" },
        { status: 500 }
      );
    }

    // Send welcome email
    try {
      const welcomeHtml = EMAIL_TEMPLATES.layout(
        EMAIL_TEMPLATES.welcome({ firstName: user?.user_metadata?.name })
      );

      const finalHtml = replaceTemplateVars(welcomeHtml, {
        email,
        unsubscribeUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/newsletter/unsubscribe?email=${encodeURIComponent(email)}`,
        preferencesUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/notifications`,
      });

      await resend.emails.send({
        from: "Austerian Research <research@austerian.com>",
        to: email,
        subject: "Welcome to Austerian Research Weekly Briefs",
        html: finalHtml,
      });
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Don't fail the subscription if email fails
    }

    return NextResponse.json({
      message: "Subscribed successfully",
      alreadySubscribed: false,
    });
  } catch (error) {
    console.error("Error in newsletter subscribe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
