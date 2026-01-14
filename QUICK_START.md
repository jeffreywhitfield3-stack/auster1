# Quick Start - Social Features

## ⚡ 3-Step Setup

### Step 1: Run the SQL File

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the **entire contents** of `RUN_THIS_IN_SUPABASE.sql`
6. Paste it into the editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

**Expected output:**
```
NOTICE: Created follows table
NOTICE: Created user_profiles table
NOTICE: Created model_comments table
NOTICE: Created comment_likes table
NOTICE: Added comment_count to models
...
NOTICE: Social Features Setup Complete!
```

### Step 2: Start Your Dev Server

```bash
npm run dev
```

### Step 3: Test It!

1. **Sign in** to your account
2. Go to **Settings → Profile** (http://localhost:3000/settings/profile)
3. Fill out your profile (display name, bio, etc.)
4. Click **Save Changes**
5. Click **View Public Profile** to see your profile at `/@your-username`

## ✅ Quick Tests

### Test Profiles
- Visit your profile: `/@your-username`
- Should show your info, models, and research

### Test Comments
- Go to any model page
- Scroll down to comments section
- Leave a comment
- Try replying to a comment
- Try liking a comment

### Test Follows
- Create a second test account
- Visit their profile: `/@their-username`
- Click "Follow" button
- Check the notification bell icon (should have badge)

### Test Notifications
- Click the bell icon in TopNav
- Should see "New follower" notification
- Click notification to mark as read

## 🐛 Troubleshooting

### "Relation already exists" errors
The SQL file handles this automatically with `IF NOT EXISTS` checks. Just re-run it.

### No profiles created
Check if users exist:
```sql
SELECT COUNT(*) FROM user_profiles;
```

If zero, run the backfill section manually (it's at the end of the SQL file).

### Comments not showing
Check if the table exists:
```sql
SELECT * FROM model_comments LIMIT 5;
```

## 📚 Full Documentation

- **Setup Guide**: `PHASE_1_SETUP_AND_TESTING_GUIDE.md`
- **Complete Overview**: `PHASE_1_COMPLETE.md`

## 🎉 That's It!

Your social features are now live! Check the bell icon for notifications and start testing.
