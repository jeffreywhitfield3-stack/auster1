// API Route: Send emails for existing published brief
// POST /api/briefs/send-existing

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  resend,
  EMAIL_CONFIG,
  EMAIL_TEMPLATES,
  replaceTemplateVars,
} from "@/lib/email/resend";

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { briefId } = body;

    // Verify authorization (admin or cron)
    const authHeader = request.headers.get("authorization");
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCron) {
      const supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.email !== "jeffreywhitfield3@gmail.com") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    if (!briefId) {
      return NextResponse.json(
        { error: "Brief ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get the brief
    const { data: brief, error: briefError } = await supabase
      .from("weekly_briefs")
      .select("*")
      .eq("id", briefId)
      .single();

    if (briefError || !brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    // Check if already sent
    if (brief.is_sent) {
      return NextResponse.json(
        { error: "Brief has already been sent" },
        { status: 400 }
      );
    }

    // Get all active subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from("newsletter_subscriptions")
      .select("user_id, email")
      .eq("is_active", true)
      .eq("weekly_briefs", true)
      .is("unsubscribed_at", null);

    if (subscribersError || !subscribers || subscribers.length === 0) {
      return NextResponse.json(
        { error: "No active subscribers found" },
        { status: 400 }
      );
    }

    // Prepare email content
    const briefUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/research/briefs/${brief.slug}`;

    const emailContent = EMAIL_TEMPLATES.weeklyBrief({
      title: brief.title,
      summary: brief.summary,
      tradeIdeas: (brief.trade_ideas || []).slice(0, 3).map((idea: any) => ({
        symbol: idea.symbol,
        strategy: idea.strategy_type,
        thesis: idea.thesis,
        maxProfit: idea.max_profit,
        maxLoss: idea.max_loss,
      })),
      economicEvents: (brief.economic_events || []).slice(0, 3).map((event: any) => ({
        name: event.name,
        date: formatEventDate(event.date),
        importance: event.importance,
        impact: event.impact,
      })),
      briefUrl,
    });

    const emailHtml = EMAIL_TEMPLATES.layout(emailContent);

    // Send emails in batches
    const BATCH_SIZE = 100;
    let emailsSent = 0;
    let emailsFailed = 0;

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);

      const emailPromises = batch.map(async (subscriber) => {
        try {
          // Create email log entry
          const { data: emailLog } = await supabase
            .from("email_logs")
            .insert({
              recipient_user_id: subscriber.user_id,
              recipient_email: subscriber.email,
              email_type: "weekly_brief",
              brief_id: brief.id,
              status: "pending",
            })
            .select()
            .single();

          if (!emailLog) {
            throw new Error("Failed to create email log");
          }

          // Replace template variables
          const finalHtml = replaceTemplateVars(emailHtml, {
            email: subscriber.email,
            unsubscribeUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}`,
            preferencesUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/notifications`,
          });

          // Send email via Resend
          const { data: emailData, error: emailError } = await resend.emails.send({
            from: EMAIL_CONFIG.from,
            to: subscriber.email,
            subject: `${EMAIL_CONFIG.weeklyBriefSubjectPrefix} ${brief.title}`,
            html: finalHtml,
          });

          if (emailError) {
            throw emailError;
          }

          // Update email log with success
          await supabase
            .from("email_logs")
            .update({
              status: "sent",
              resend_id: emailData.id,
              sent_at: new Date().toISOString(),
            })
            .eq("id", emailLog.id);

          emailsSent++;
        } catch (error) {
          console.error(`Error sending email to ${subscriber.email}:`, error);

          // Update email log with failure
          await supabase
            .from("email_logs")
            .update({
              status: "failed",
              error_message:
                error instanceof Error ? error.message : "Unknown error",
            })
            .eq("recipient_email", subscriber.email)
            .eq("brief_id", brief.id);

          emailsFailed++;
        }
      });

      await Promise.all(emailPromises);

      // Rate limiting: wait 1 second between batches
      if (i + BATCH_SIZE < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Update brief with email stats
    await supabase
      .from("weekly_briefs")
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
        email_sent_count: emailsSent,
      })
      .eq("id", brief.id);

    return NextResponse.json({
      message: "Emails sent successfully",
      emailsSent,
      emailsFailed,
      totalSubscribers: subscribers.length,
    });
  } catch (error) {
    console.error("Error sending brief emails:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
