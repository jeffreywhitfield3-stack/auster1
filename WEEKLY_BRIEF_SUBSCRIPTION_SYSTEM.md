# Weekly Brief Email Subscription System

## Overview

The weekly brief email system sends automated weekly economic and market analysis emails to subscribed users. This document explains who receives emails, how subscriptions work, and how users can manage their preferences.

## Who Receives Weekly Brief Emails?

Users receive weekly brief emails if **ALL** of the following conditions are met:

1. ✅ **`is_active = true`** - The subscription is active
2. ✅ **`weekly_briefs = true`** - User opted in for weekly briefs specifically
3. ✅ **`unsubscribed_at IS NULL`** - User has not unsubscribed

### Database Query
```sql
SELECT user_id, email
FROM newsletter_subscriptions
WHERE is_active = true
  AND weekly_briefs = true
  AND unsubscribed_at IS NULL;
```

This logic is implemented in:
- `src/app/api/briefs/send-existing/route.ts:71-76`
- Database function: `get_weekly_brief_subscribers()` in `supabase_schema_weekly_briefs.sql:338-353`

## Subscription Sources

Users can subscribe from multiple places, tracked via the `subscription_source` field:

- **`signup`** - During account registration
- **`research_page`** - From the research/briefs page
- **`settings`** - From email preferences in settings

## Email Preference Types

The `newsletter_subscriptions` table supports 4 email types (all boolean flags):

1. **`weekly_briefs`** - Weekly economic analysis (sent every Sunday 6 PM ET)
2. **`trade_alerts`** - Real-time trade alerts (future feature)
3. **`research_updates`** - New research publications (future feature)
4. **`market_events`** - Important market events (future feature)

Users can opt in/out of each type independently.

## Unsubscribe Flow

### One-Click Unsubscribe (from Email)
1. User clicks "Unsubscribe" link in email footer
2. URL: `/newsletter/unsubscribe?email={email}`
3. API processes GET request: `GET /api/newsletter/unsubscribe?email={email}`
4. Updates database:
   ```sql
   UPDATE newsletter_subscriptions
   SET is_active = false,
       unsubscribed_at = NOW()
   WHERE email = ?
   ```
5. Redirects to confirmation page: `/newsletter/unsubscribe?success=true`

### Manual Unsubscribe (from Website)
1. User visits `/newsletter/unsubscribe`
2. Enters their email address in the form
3. Submits form → `POST /api/newsletter/unsubscribe`
4. Same database update as above
5. Shows success message on the same page

### Resubscribe
Users can resubscribe anytime by:
1. Signing into their account
2. Going to **Settings → Notifications** (`/settings/notifications`)
3. Toggling "Weekly Briefs" back on

## Email Template Structure

Every email includes:

### Header
- Austerian Research branding
- Blue gradient banner with 🏛️ emoji

### Body
- Brief title and summary (3-4 sentences preview)
- Top 3 trade ideas with risk/reward stats
- Top 3 economic events with importance badges
- "Read Full Analysis" CTA button → links to full brief on website

### Footer (includes unsubscribe link)
```html
<a href="{{unsubscribeUrl}}">Unsubscribe</a> |
<a href="{{preferencesUrl}}">Email Preferences</a> |
<a href="https://austerian.com">Visit Austerian</a>

© 2026 Austerian. All rights reserved.
This email was sent to {{email}}.
```

**Unsubscribe URL format:**
```
https://austerian.com/newsletter/unsubscribe?email={encoded_email}
```

## Automated Sending Schedule

### Cron Job Configuration
- **File:** `src/app/api/cron/weekly-brief/route.ts`
- **Schedule:** Every Sunday at 6:00 PM ET
- **Cron Expression:** `"0 18 * * 0"` (configured in `vercel.json`)
- **Max Execution Time:** 5 minutes (300 seconds)

### Cron Job Logic
1. Verify request is from Vercel (checks `CRON_SECRET`)
2. Check if brief already sent this week (prevents duplicates)
3. Find published but unsent briefs:
   ```sql
   SELECT * FROM weekly_briefs
   WHERE is_published = true
     AND is_sent = false
   ORDER BY created_at DESC
   LIMIT 1
   ```
4. If brief found, call `POST /api/briefs/send-existing` to send emails
5. Log results (emails sent, failed, total subscribers)

## Rate Limiting

To respect Resend's rate limits (100 emails/day on free tier):

- **Batch Size:** 100 emails per batch
- **Delay Between Batches:** 1 second
- **Total Capacity:** Handles 2,000+ subscribers (with proper tier)

Implementation in `send-existing/route.ts:104-123`.

## Email Tracking

Every sent email creates an entry in the `email_logs` table:

```sql
INSERT INTO email_logs (
  recipient_user_id,
  recipient_email,
  email_type,        -- 'weekly_brief'
  brief_id,
  status,            -- 'pending' → 'sent' → 'opened' → 'clicked'
  resend_id,         -- Resend email ID for tracking
  sent_at
) VALUES (?, ?, ?, ?, ?, ?, ?);
```

### Tracking Events
- **sent_at** - When email was sent
- **opened_at** - When user opened email (future: webhook from Resend)
- **clicked_at** - When user clicked link (future: webhook from Resend)
- **bounced_at** - If email bounced

## Database Schema

### `newsletter_subscriptions` Table
```sql
CREATE TABLE newsletter_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,

  -- Status
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,

  -- Preferences (4 types of emails)
  weekly_briefs BOOLEAN DEFAULT true,
  trade_alerts BOOLEAN DEFAULT true,
  research_updates BOOLEAN DEFAULT true,
  market_events BOOLEAN DEFAULT true,

  -- Metadata
  subscription_source TEXT, -- 'signup', 'research_page', 'settings'
  utm_source TEXT,
  utm_campaign TEXT,

  -- Analytics
  email_opens INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  last_email_opened_at TIMESTAMPTZ,
  last_email_clicked_at TIMESTAMPTZ
);
```

### Important Indexes
```sql
-- Fast lookup for active subscribers
CREATE INDEX idx_newsletter_active_subscribers
  ON newsletter_subscriptions(is_active, weekly_briefs)
  WHERE is_active = true;

-- Fast lookup by email for unsubscribe
CREATE INDEX idx_newsletter_email
  ON newsletter_subscriptions(email);
```

## API Endpoints

### Subscribe
```bash
POST /api/newsletter/subscribe
Content-Type: application/json

{
  "email": "user@example.com",
  "source": "signup",
  "preferences": {
    "weekly_briefs": true,
    "trade_alerts": true,
    "research_updates": false,
    "market_events": true
  }
}
```

### Unsubscribe (POST)
```bash
POST /api/newsletter/unsubscribe
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Unsubscribe (GET - one-click from email)
```bash
GET /api/newsletter/unsubscribe?email=user@example.com
```

### Send Weekly Brief
```bash
POST /api/briefs/send-existing
Authorization: Bearer {CRON_SECRET or admin session}
Content-Type: application/json

{
  "briefId": "uuid-of-published-brief"
}
```

### Cron Job (automated)
```bash
GET /api/cron/weekly-brief
Authorization: Bearer {CRON_SECRET}
```

## User Flows

### New User Signup with Subscription
```
1. User creates account
   ↓
2. Signup form includes checkbox: "Send me weekly market briefs"
   ↓
3. If checked, create newsletter_subscriptions entry:
   - is_active: true
   - weekly_briefs: true
   - subscription_source: 'signup'
   ↓
4. Send welcome email immediately
   ↓
5. User receives first brief on next Sunday at 6 PM
```

### User Unsubscribes
```
1. User clicks "Unsubscribe" in email
   ↓
2. Lands on /newsletter/unsubscribe?email={email}
   ↓
3. GET /api/newsletter/unsubscribe processes request
   ↓
4. Database updated:
   - is_active: false
   - unsubscribed_at: NOW()
   ↓
5. User sees confirmation page
   ↓
6. User no longer receives weekly briefs
```

### User Re-subscribes
```
1. User signs in
   ↓
2. Goes to Settings → Notifications
   ↓
3. Toggles "Weekly Briefs" to ON
   ↓
4. PATCH request updates newsletter_subscriptions:
   - is_active: true
   - weekly_briefs: true
   - unsubscribed_at: NULL
   ↓
5. User receives next week's brief
```

## Security & Privacy

### Row Level Security (RLS)
```sql
-- Users can only view/edit their own subscription
CREATE POLICY "Users can view their own subscription"
  ON newsletter_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON newsletter_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);
```

### Admin Access
Only the admin email (`jeffreywhitfield3@gmail.com`) can:
- Manually trigger email sends
- View all subscribers
- Access `/admin/briefs` to compose briefs

### Cron Authentication
Cron jobs must include:
```
Authorization: Bearer {CRON_SECRET}
```

This prevents unauthorized triggering of mass emails.

## Testing Checklist

Before going live, test:

- [ ] **Subscribe Flow**
  - [ ] New user signup with weekly briefs checked
  - [ ] Verify entry in `newsletter_subscriptions` table
  - [ ] Verify welcome email sent

- [ ] **Unsubscribe Flow (One-Click)**
  - [ ] Click unsubscribe link in email
  - [ ] Verify redirect to success page
  - [ ] Verify `is_active = false` in database
  - [ ] Verify `unsubscribed_at` is set

- [ ] **Unsubscribe Flow (Manual)**
  - [ ] Visit `/newsletter/unsubscribe`
  - [ ] Enter email and submit form
  - [ ] Verify success message
  - [ ] Verify database updated

- [ ] **Resubscribe Flow**
  - [ ] Sign in as unsubscribed user
  - [ ] Go to Settings → Notifications
  - [ ] Toggle weekly briefs ON
  - [ ] Verify database updated

- [ ] **Email Sending**
  - [ ] Create test brief in `/admin/briefs`
  - [ ] Publish and send to subscribers
  - [ ] Verify email received with proper formatting
  - [ ] Verify unsubscribe link works
  - [ ] Verify "Read Full Analysis" CTA links to correct URL

- [ ] **Cron Job**
  - [ ] Manually trigger cron endpoint with `CRON_SECRET`
  - [ ] Verify brief is sent to all eligible subscribers
  - [ ] Verify duplicate prevention (won't send same brief twice)
  - [ ] Verify email logs created

## Cost Analysis

### Resend Free Tier
- **3,000 emails/month**
- **100 emails/day**

### Usage Estimate
- 500 subscribers × 4 weeks = **2,000 emails/month** ✅
- 1 brief/week × 500 subscribers = **500 emails/week** ✅

**Conclusion:** Free tier is sufficient for up to 750 subscribers.

For more subscribers, upgrade to Resend's paid tier ($20/month for 50,000 emails).

## Troubleshooting

### Users Not Receiving Emails
1. Check `newsletter_subscriptions` table:
   ```sql
   SELECT * FROM newsletter_subscriptions WHERE email = 'user@example.com';
   ```
2. Verify all three conditions are met:
   - `is_active = true`
   - `weekly_briefs = true`
   - `unsubscribed_at IS NULL`

### Duplicate Emails Sent
- Cron job checks if brief already sent this week
- Ensure `is_sent` flag is properly updated after sending

### Email Delivery Failures
1. Check `email_logs` table:
   ```sql
   SELECT * FROM email_logs WHERE status = 'failed';
   ```
2. Review `error_message` column for details
3. Common issues:
   - Invalid email address
   - Resend rate limit exceeded
   - Resend API key invalid

### Unsubscribe Link Not Working
1. Verify `NEXT_PUBLIC_SITE_URL` environment variable is set
2. Check that `/newsletter/unsubscribe` page exists
3. Verify API route `/api/newsletter/unsubscribe` is deployed

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── newsletter/
│   │   │   ├── subscribe/route.ts
│   │   │   └── unsubscribe/route.ts
│   │   ├── briefs/
│   │   │   ├── publish/route.ts
│   │   │   ├── send-existing/route.ts
│   │   │   ├── list/route.ts
│   │   │   └── [slug]/route.ts
│   │   └── cron/
│   │       └── weekly-brief/route.ts
│   └── newsletter/
│       └── unsubscribe/
│           ├── page.tsx
│           └── UnsubscribeClient.tsx
└── lib/
    └── email/
        └── resend.ts (email templates & config)
```

## Environment Variables Required

```bash
# Resend API Key (get from resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Cron secret (generate random string)
CRON_SECRET=your-random-secret-key

# Site URL (for email links)
NEXT_PUBLIC_SITE_URL=https://austerian.com
```

## Next Steps

1. **Ensure database migration is run** (see `supabase_schema_weekly_briefs.sql`)
2. **Add environment variables** to Vercel
3. **Verify Resend domain** for sending emails
4. **Test all flows** using checklist above
5. **Create first brief** in `/admin/briefs`
6. **Monitor `email_logs` table** for delivery issues

## Future Enhancements

- [ ] Webhook handlers for email opens/clicks tracking (Resend webhooks)
- [ ] A/B testing for subject lines
- [ ] Personalized recommendations per user
- [ ] Analytics dashboard showing open rates, CTR, subscriber growth
- [ ] SMS alerts for critical events
- [ ] Weekly digest preferences (choose day/time)
- [ ] Content preferences (e.g., "only show iron condor strategies")
