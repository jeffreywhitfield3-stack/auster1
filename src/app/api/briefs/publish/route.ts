// API Route: Publish weekly brief and send emails
// POST /api/briefs/publish

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  resend,
  EMAIL_CONFIG,
  EMAIL_TEMPLATES,
  replaceTemplateVars,
} from "@/lib/email/resend";

// Helper to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Helper to format date for email
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
    const {
      title,
      summary,
      content,
      tradeIdeas,
      economicEvents,
      weekStartDate,
      weekEndDate,
      sendEmail = true,
      generationMethod = "manual",
    } = body;

    // Validate required fields
    if (!title || !summary || !content) {
      return NextResponse.json(
        { error: "Title, summary, and content are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email !== "jeffreywhitfield3@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Generate slug
    const slug = generateSlug(title);

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("weekly_briefs")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A brief with this title already exists" },
        { status: 400 }
      );
    }

    // Insert weekly brief
    const { data: brief, error: briefError } = await supabase
      .from("weekly_briefs")
      .insert({
        title,
        slug,
        summary,
        content,
        trade_ideas: tradeIdeas || [],
        economic_events: economicEvents || [],
        week_start_date: weekStartDate || new Date().toISOString().split("T")[0],
        week_end_date:
          weekEndDate ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        is_published: true,
        published_at: new Date().toISOString(),
        created_by: user.id,
        generation_method: generationMethod,
      })
      .select()
      .single();

    if (briefError || !brief) {
      console.error("Error creating brief:", briefError);
      return NextResponse.json(
        { error: "Failed to create brief" },
        { status: 500 }
      );
    }

    // If sendEmail is false, just return the brief
    if (!sendEmail) {
      return NextResponse.json({
        message: "Brief published successfully",
        brief,
        emailsSent: 0,
      });
    }

    // Get all active subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from("newsletter_subscriptions")
      .select("user_id, email")
      .eq("is_active", true)
      .eq("weekly_briefs", true)
      .is("unsubscribed_at", null);

    if (subscribersError) {
      console.error("Error fetching subscribers:", subscribersError);
      return NextResponse.json(
        {
          message: "Brief published but failed to fetch subscribers",
          brief,
          emailsSent: 0,
        },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({
        message: "Brief published successfully (no subscribers)",
        brief,
        emailsSent: 0,
      });
    }

    // Prepare email content
    const briefUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/research/briefs/${slug}`;

    const emailContent = EMAIL_TEMPLATES.weeklyBrief({
      title,
      summary,
      tradeIdeas: (tradeIdeas || []).slice(0, 3).map((idea: any) => ({
        symbol: idea.symbol,
        strategy: idea.strategy_type,
        thesis: idea.thesis,
        maxProfit: idea.max_profit,
        maxLoss: idea.max_loss,
      })),
      economicEvents: (economicEvents || []).slice(0, 3).map((event: any) => ({
        name: event.name,
        date: formatEventDate(event.date),
        importance: event.importance,
        impact: event.impact,
      })),
      briefUrl,
    });

    const emailHtml = EMAIL_TEMPLATES.layout(emailContent);

    // Send emails in batches (Resend has rate limits)
    const BATCH_SIZE = 100;
    let emailsSent = 0;
    let emailsFailed = 0;

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);

      // Send emails in parallel within batch
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
            subject: `${EMAIL_CONFIG.weeklyBriefSubjectPrefix} ${title}`,
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
              error_message: error instanceof Error ? error.message : "Unknown error",
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
      message: "Brief published and emails sent successfully",
      brief,
      emailsSent,
      emailsFailed,
      totalSubscribers: subscribers.length,
    });
  } catch (error) {
    console.error("Error in brief publish:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
