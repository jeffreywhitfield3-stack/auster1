# Weekly Economic Briefs - Complete Setup Guide

## Overview

This guide will help you set up the weekly economic briefs system that sends curated market analysis and trade ideas to your users every Sunday at 6 PM ET.

---

## What We Built

### Core Features

1. **Email Newsletter System**
   - Subscribe/unsubscribe functionality
   - Email preference management
   - Welcome emails for new subscribers
   - One-click unsubscribe links

2. **Weekly Briefs**
   - Admin UI for composing briefs
   - Rich content with trade ideas and economic events
   - Email preview system
   - Markdown support for full content

3. **Automated Delivery**
   - Vercel Cron job (every Sunday 6 PM ET)
   - Batch email sending (respects rate limits)
   - Email delivery tracking
   - Analytics (open rates, click rates)

4. **User Experience**
   - Email shows preview (3-4 sentences)
   - "Read full analysis" CTA links to website
   - Full content visible only on site (drives traffic)
   - SEO benefits from published research

---

## Step 1: Set Up Resend (Email Service)

### 1.1 Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up with your email
3. Verify your email address

### 1.2 Verify Your Domain

**IMPORTANT:** You must verify your domain to send emails from `research@austerian.com`

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `austerian.com`
4. Add the DNS records Resend provides to your DNS provider:
   - **TXT record** for domain verification
   - **MX records** for email receiving (optional)
   - **CNAME records** for DKIM signing

**DNS Records Example:**
```
Type: TXT
Name: _resend
Value: resend_verify_xxxxxxxxxxxxxxxx

Type: MX
Name: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
```

5. Wait for DNS propagation (can take up to 48 hours, usually 5-10 minutes)
6. Click **Verify Domain** in Resend dashboard

### 1.3 Get API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it: `Austerian Production`
4. Select permission: **Sending access**
5. Copy the API key (starts with `re_`)

### 1.4 Add API Key to Vercel

1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add new variable:
   - **Key:** `RESEND_API_KEY`
   - **Value:** `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Environments:** Production, Preview, Development
4. Click **Save**

---

## Step 2: Set Up Database Tables

### 2.1 Run Database Migration

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase_schema_weekly_briefs.sql`
5. Paste into the SQL editor
6. Click **Run**

This creates:
- `newsletter_subscriptions` - User email preferences
- `weekly_briefs` - Published briefs
- `email_logs` - Email delivery tracking
- `trade_ideas` - Structured trade recommendations
- `economic_events` - Market calendar events

### 2.2 Verify Tables

Check that all tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'newsletter_subscriptions',
  'weekly_briefs',
  'email_logs',
  'trade_ideas',
  'economic_events'
);
```

You should see all 5 tables listed.

---

## Step 3: Configure Vercel Cron

### 3.1 Set Cron Secret

1. Go to Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add new variable:
   - **Key:** `CRON_SECRET`
   - **Value:** Generate a secure random string (use https://www.uuidgenerator.net/)
   - **Environments:** Production only
4. Click **Save**

**Example:**
```
CRON_SECRET=7f8e9d6c5b4a3210fedcba9876543210
```

### 3.2 Verify Cron Configuration

The `vercel.json` file should already be in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-brief",
      "schedule": "0 18 * * 0"
    }
  ]
}
```

**Cron Schedule Explained:**
- `0 18 * * 0` = Every Sunday at 6:00 PM (18:00) UTC
- To change time, adjust the schedule: `minute hour day month dayOfWeek`

**Note:** Vercel cron runs in UTC. If you want 6 PM ET:
- EST (winter): 6 PM ET = 11 PM UTC = `0 23 * * 0`
- EDT (summer): 6 PM ET = 10 PM UTC = `0 22 * * 0`

### 3.3 Deploy to Vercel

```bash
git add .
git commit -m "Add weekly briefs feature"
git push
```

Vercel will automatically deploy and register the cron job.

### 3.4 Verify Cron is Active

1. Go to Vercel dashboard
2. Go to **Cron Jobs** tab
3. You should see: `POST /api/cron/weekly-brief - Every Sunday at 6:00 PM`

---

## Step 4: Test the System

### 4.1 Test Newsletter Subscription

1. Open your site: https://austerian.com
2. You'll need to add a newsletter signup form somewhere (see "Optional: Add Signup Form" below)
3. Or test directly via API:

```bash
curl -X POST https://austerian.com/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@example.com",
    "preferences": {
      "weekly_briefs": true,
      "trade_alerts": true
    },
    "source": "test"
  }'
```

4. Check your email for the welcome message

### 4.2 Test Brief Creation

1. Go to https://austerian.com/app/admin/briefs
2. Log in with your admin account (`jeffreywhitfield3@gmail.com`)
3. Fill out the form:
   - **Title:** "Test Brief - January 2026"
   - **Summary:** "This is a test of the weekly brief system"
   - **Content:** Add some markdown content
   - **Trade Ideas:** Add 1-2 test trades
   - **Economic Events:** Add 1-2 upcoming events
4. **UNCHECK "Send email to subscribers"** for your first test
5. Click **Publish Brief**
6. You should see success message with brief URL

### 4.3 View Published Brief

1. Go to the brief URL (e.g., https://austerian.com/research/briefs/test-brief-january-2026)
2. Verify all content displays correctly
3. Check that trade ideas and events render properly

### 4.4 Test Email Sending

1. Create another brief or use the existing one
2. This time, **CHECK "Send email to subscribers"**
3. Click **Publish Brief**
4. Wait for processing (may take 1-2 minutes for batch sending)
5. Check your email inbox for the brief

### 4.5 Test Email Preferences

1. Go to https://austerian.com/settings/notifications
2. Verify you can toggle preferences
3. Click "Save Preferences"
4. Test "Unsubscribe from All"
5. Test "Resubscribe"

---

## Step 5: Environment Variables Checklist

Make sure you have all required environment variables in Vercel:

```bash
# Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Cron Authentication
CRON_SECRET=your-secure-random-string

# Site URL (should already exist)
NEXT_PUBLIC_SITE_URL=https://austerian.com

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxxx

# Stripe (should already exist)
STRIPE_SECRET_KEY=sk_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Market Data APIs (should already exist)
POLYGON_API_KEY=xxxxxx
FMP_API_KEY=xxxxxx
FRED_API_KEY=xxxxxx
```

---

## How It Works

### User Journey

1. **Subscription:**
   - User subscribes via signup form or settings page
   - Welcome email sent immediately
   - Email address added to `newsletter_subscriptions` table

2. **Brief Creation (Manual):**
   - Admin logs into `/admin/briefs`
   - Composes brief with trade ideas and events
   - Clicks "Publish" with "Send email" checked
   - System sends emails to all active subscribers
   - Brief published to `/research/briefs/[slug]`

3. **Brief Creation (Automated - Future):**
   - Cron runs every Sunday at 6 PM
   - Checks for unpublished briefs
   - Sends emails if brief exists
   - (Can be enhanced with AI generation)

4. **Email Delivery:**
   - User receives email with preview (3-4 sentences)
   - Email includes top 3 trade ideas and events
   - "Read Full Analysis" button links to website
   - Full content only visible on site (drives traffic)

5. **Analytics:**
   - Track email opens (when user views email)
   - Track clicks (when user clicks links)
   - View stats in admin dashboard (future)

### Technical Flow

```
Admin creates brief
    ↓
POST /api/briefs/publish
    ↓
Insert into weekly_briefs table
    ↓
Fetch all active subscribers
    ↓
Generate email HTML from template
    ↓
Send emails in batches (100 at a time)
    ↓
Log each email in email_logs table
    ↓
Update brief: is_sent = true
    ↓
Return success with stats
```

---

## Optional: Add Newsletter Signup Form

You can add a newsletter signup form to your homepage or footer. Here's a component you can use:

### Create Newsletter Signup Component

```tsx
// /src/components/shared/NewsletterSignup.tsx
"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          preferences: {
            weekly_briefs: true,
            trade_alerts: true,
            research_updates: true,
            market_events: true,
          },
          source: "homepage",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to subscribe");
      }

      setMessage({ type: "success", text: "Successfully subscribed! Check your email." });
      setEmail("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to subscribe",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <h3 className="mb-2 text-xl font-bold text-zinc-900">Weekly Market Briefs</h3>
      <p className="mb-4 text-sm text-zinc-600">
        Get top trade ideas and economic insights every Sunday at 6 PM
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={loading}
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:outline-none disabled:bg-zinc-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-zinc-300"
        >
          {loading ? "..." : "Subscribe"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
```

### Add to Homepage

```tsx
// In your homepage or landing page
import NewsletterSignup from "@/components/shared/NewsletterSignup";

export default function HomePage() {
  return (
    <div>
      {/* Your existing content */}

      <section className="py-12">
        <div className="container mx-auto px-4">
          <NewsletterSignup />
        </div>
      </section>
    </div>
  );
}
```

---

## Monitoring & Analytics

### Check Email Logs

```sql
-- See all sent emails
SELECT
  email_type,
  status,
  COUNT(*) as count
FROM email_logs
GROUP BY email_type, status;

-- See recent email activity
SELECT
  recipient_email,
  email_type,
  status,
  sent_at,
  opened_at,
  clicked_at
FROM email_logs
ORDER BY sent_at DESC
LIMIT 50;
```

### Check Subscriber Stats

```sql
-- Total active subscribers
SELECT COUNT(*) as active_subscribers
FROM newsletter_subscriptions
WHERE is_active = true;

-- Subscribers by preference
SELECT
  SUM(CASE WHEN weekly_briefs THEN 1 ELSE 0 END) as weekly_briefs,
  SUM(CASE WHEN trade_alerts THEN 1 ELSE 0 END) as trade_alerts,
  SUM(CASE WHEN research_updates THEN 1 ELSE 0 END) as research_updates,
  SUM(CASE WHEN market_events THEN 1 ELSE 0 END) as market_events
FROM newsletter_subscriptions
WHERE is_active = true;
```

### Check Brief Performance

```sql
-- See all published briefs
SELECT
  title,
  published_at,
  email_sent_count,
  email_open_rate,
  page_views
FROM weekly_briefs
WHERE is_published = true
ORDER BY published_at DESC;
```

---

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key:**
   ```bash
   # In Vercel dashboard, verify RESEND_API_KEY exists
   ```

2. **Check Domain Verification:**
   - Go to Resend dashboard → Domains
   - Ensure `austerian.com` is verified (green checkmark)

3. **Check Email Logs:**
   ```sql
   SELECT * FROM email_logs
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

4. **Check Subscriber Count:**
   ```sql
   SELECT COUNT(*) FROM newsletter_subscriptions
   WHERE is_active = true AND weekly_briefs = true;
   ```

### Cron Not Running

1. **Check Vercel Dashboard:**
   - Go to Cron Jobs tab
   - Verify cron is listed

2. **Check Cron Logs:**
   - Go to Deployments → Your latest deployment
   - Click "Functions" tab
   - Look for `/api/cron/weekly-brief` logs

3. **Test Cron Manually:**
   ```bash
   curl -X GET https://austerian.com/api/cron/weekly-brief \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

### Brief Not Publishing

1. **Check Admin Permission:**
   - Ensure you're logged in with `jeffreywhitfield3@gmail.com`

2. **Check Database:**
   ```sql
   SELECT * FROM weekly_briefs
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Check Browser Console:**
   - Open DevTools → Console
   - Look for API errors

---

## Cost Breakdown

### Resend Pricing

**Free Tier:**
- 3,000 emails/month
- 100 emails/day
- All features included

**Paid Plans (if you exceed free tier):**
- $20/month: 50,000 emails
- $80/month: 500,000 emails

**Your Usage Estimate:**
- 1 weekly brief × 4 weeks = 4 emails/month
- If you have 500 subscribers: 500 × 4 = 2,000 emails/month
- **Fits within free tier! 🎉**

### Total Additional Cost

**$0/month** (within Resend free tier)

---

## Future Enhancements

### Phase 2: AI-Powered Brief Generation

The cron job can be enhanced to automatically generate briefs using:

1. **Derivatives Anomaly Detection:**
   - Fetch from `/api/derivatives/anomalies`
   - Identify unusual IV rank, Vol/OI ratios
   - Generate trade ideas automatically

2. **Economic Calendar Integration:**
   - Scrape or fetch from APIs
   - Highlight key events for the week
   - Explain expected market impact

3. **AI Summarization:**
   - Use Claude API to analyze market data
   - Generate trading thesis
   - Create risk/reward profiles

**Implementation would involve:**
```typescript
// In /api/cron/weekly-brief/route.ts
const generateAIBrief = async () => {
  // 1. Fetch derivatives anomalies
  const anomalies = await fetch('/api/derivatives/anomalies');

  // 2. Fetch economic calendar
  const events = await fetchEconomicCalendar();

  // 3. Generate brief with AI
  const brief = await anthropic.messages.create({
    model: "claude-opus-4-5",
    messages: [{
      role: "user",
      content: `Analyze these market anomalies and events, then generate trade ideas: ${JSON.stringify({ anomalies, events })}`
    }]
  });

  // 4. Publish the brief
  return await publishBrief(brief);
};
```

### Phase 3: Advanced Analytics

- Email heatmaps (when users open emails)
- A/B testing for subject lines
- Personalized trade recommendations per user
- SMS alerts for critical events
- Mobile push notifications

---

## Support

If you encounter issues:

1. **Check this guide first**
2. **Review Vercel deployment logs**
3. **Check Supabase logs**
4. **Check Resend dashboard for email delivery status**
5. **Email support:** support@austerian.com

---

## Summary

You now have a complete weekly newsletter system that:

✅ Sends curated market briefs every Sunday
✅ Drives traffic to your site with preview emails
✅ Tracks subscriber preferences and analytics
✅ Costs $0/month (within free tier)
✅ Scales to thousands of subscribers
✅ Integrates with your existing derivatives data

**Next Steps:**
1. Run the database migration
2. Set up Resend and verify your domain
3. Add environment variables to Vercel
4. Test with a few subscribers
5. Create your first brief
6. Monitor analytics

Good luck! 🚀
