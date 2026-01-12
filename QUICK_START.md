# Weekly Briefs - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Resend Setup (2 minutes)

1. Go to [resend.com](https://resend.com) and sign up
2. Click **Domains** → **Add Domain** → Enter `austerian.com`
3. Add the DNS records to your DNS provider (Vercel/Cloudflare/etc.)
4. Wait 5-10 minutes for DNS propagation
5. Click **Verify Domain** in Resend
6. Go to **API Keys** → **Create API Key** → Copy the key

### Step 2: Add Environment Variables (1 minute)

In Vercel Dashboard → Settings → Environment Variables:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
CRON_SECRET=your-random-uuid-here  # Generate at https://www.uuidgenerator.net/
```

Click **Save** for each.

### Step 3: Run Database Migration (1 minute)

1. Open Supabase dashboard → SQL Editor
2. Copy all contents of `supabase_schema_weekly_briefs.sql`
3. Paste and click **Run**
4. Verify 5 tables created: `newsletter_subscriptions`, `weekly_briefs`, `email_logs`, `trade_ideas`, `economic_events`

### Step 4: Deploy (1 minute)

```bash
git add .
git commit -m "Add weekly briefs feature"
git push
```

Vercel will automatically deploy and register the cron job.

---

## ✅ Test It Works

### Test 1: Subscribe to Newsletter

```bash
curl -X POST https://austerian.com/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "preferences": {
      "weekly_briefs": true
    }
  }'
```

Check your email for welcome message.

### Test 2: Create a Brief

1. Go to https://austerian.com/app/admin/briefs
2. Fill in:
   - Title: "Test Brief"
   - Summary: "This is a test"
   - Content: "Full content here"
3. **UNCHECK "Send email"** for first test
4. Click **Publish Brief**

### Test 3: View the Brief

Go to the URL shown after publishing (e.g., `/research/briefs/test-brief`)

### Test 4: Send Email

1. Create another brief
2. **CHECK "Send email to subscribers"**
3. Click **Publish Brief**
4. Check your email inbox

### Test 5: Manage Preferences

1. Go to https://austerian.com/settings/notifications
2. Toggle preferences
3. Click **Save**

---

## 🎯 You're Done!

The system is now live and will automatically send emails every Sunday at 6 PM.

### What Happens Next:

- **Every Sunday at 6 PM:** Cron checks for unpublished briefs
- **If brief exists:** Sends emails to all active subscribers
- **Email contains:** Title, summary, top 3 trades, top 3 events
- **Email links to:** Full content on your website
- **Analytics tracked:** Opens, clicks, page views

---

## 📊 Monitor Performance

### Check Subscribers
```sql
SELECT COUNT(*) FROM newsletter_subscriptions WHERE is_active = true;
```

### Check Email Stats
```sql
SELECT status, COUNT(*) FROM email_logs GROUP BY status;
```

### Check Briefs
```sql
SELECT title, email_sent_count, page_views FROM weekly_briefs ORDER BY published_at DESC;
```

---

## 🚨 Troubleshooting

**Emails not sending?**
- Check Resend dashboard → Domains (must be verified)
- Check Vercel logs for errors
- Verify `RESEND_API_KEY` is set correctly

**Cron not running?**
- Check Vercel dashboard → Cron Jobs tab
- Verify `CRON_SECRET` is set
- Check deployment logs

**Brief won't publish?**
- Ensure logged in as admin (`jeffreywhitfield3@gmail.com`)
- Check browser console for errors
- Verify database tables exist

---

## 💡 Pro Tips

1. **Test with yourself first** - Subscribe with your own email before inviting users
2. **Preview before sending** - Always uncheck "Send email" for first publish to preview
3. **Monitor spam scores** - Check Resend analytics to ensure deliverability
4. **Add signup forms** - Add newsletter signup to homepage, footer, or blog
5. **Promote the newsletter** - Mention it in your derivatives lab and research sections

---

## 📚 Full Documentation

For detailed information, see:
- **Setup Guide:** `WEEKLY_BRIEFS_SETUP_GUIDE.md`
- **Feature Summary:** `WEEKLY_BRIEFS_SUMMARY.md`
- **Database Schema:** `supabase_schema_weekly_briefs.sql`

---

## 🎉 Ready to Go!

Your weekly economic briefs system is production-ready and costs $0/month (within free tier).

**Time to launch:** ~5 minutes
**Cost:** $0/month (3,000 emails free)
**Value:** Priceless for user engagement! 🚀
