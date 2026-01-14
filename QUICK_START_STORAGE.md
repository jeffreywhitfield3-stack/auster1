# Quick Start: Enable Research Image Uploads

## 🚀 5-Minute Setup

Follow these steps to enable image uploads in the research publishing feature.

---

## Method 1: Using SQL (Fastest - 2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/vnivhesouldxmfetbelw/sql
2. Click **"New query"**

### Step 2: Run Setup Script
1. Copy the entire contents of `setup-research-images-bucket.sql`
2. Paste into the SQL editor
3. Click **"Run"** (or press Cmd/Ctrl + Enter)
4. You should see success messages in the results panel

### Step 3: Verify
Run this to verify everything is set up:
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'research-images';
```

**Expected result**: One row showing `research-images` with `public = true`

✅ **Done!** Skip to [Testing](#testing) section below.

---

## Method 2: Using Dashboard (5 minutes)

### Step 1: Create Bucket
1. Go to: https://supabase.com/dashboard/project/vnivhesouldxmfetbelw/storage/buckets
2. Click **"New bucket"**
3. Enter:
   - Name: `research-images`
   - ✅ Check **"Public bucket"**
4. Click **"Create bucket"**

### Step 2: Add Upload Policy
1. Click on the `research-images` bucket
2. Go to **"Policies"** tab
3. Click **"New policy"**
4. Choose **"Custom policy"**
5. Fill in:
   - **Policy name**: `authenticated_upload`
   - **Policy command**: `INSERT`
   - **Target roles**: `authenticated`
   - **USING expression**: (leave empty)
   - **WITH CHECK expression**:
   ```sql
   bucket_id = 'research-images'
   ```
6. Click **"Save policy"**

### Step 3: Add Public Read Policy
1. Click **"New policy"** again
2. Choose **"Custom policy"**
3. Fill in:
   - **Policy name**: `public_read`
   - **Policy command**: `SELECT`
   - **Target roles**: `public`
   - **USING expression**:
   ```sql
   bucket_id = 'research-images'
   ```
   - **WITH CHECK expression**: (leave empty)
4. Click **"Save policy"**

### Step 4: Add Delete Policy (Optional but Recommended)
1. Click **"New policy"** again
2. Fill in:
   - **Policy name**: `owner_delete`
   - **Policy command**: `DELETE`
   - **Target roles**: `authenticated`
   - **USING expression**:
   ```sql
   bucket_id = 'research-images' AND owner = auth.uid()::text
   ```
3. Click **"Save policy"**

✅ **Done!** Proceed to [Testing](#testing).

---

## Testing

### Option A: Run Test Script (Recommended)
```bash
node test-supabase-storage.js
```

You should see:
```
✅ Bucket exists!
✅ Read permissions work!
✅ Upload requires authentication (expected)
✅ Supabase storage is ready to use!
```

### Option B: Manual Test in Dashboard
1. Go to Storage → research-images
2. Click **"Upload file"**
3. Select any image
4. After upload, click the file
5. Copy the **Public URL**
6. Open URL in new tab → You should see the image

### Option C: Test in Your App
1. Start your dev server: `npm run dev`
2. Navigate to: http://localhost:3000/research/publish
3. Go through to the **Content** step
4. Try uploading an image
5. Image should upload and preview should appear

---

## Troubleshooting

### Error: "Bucket not found"
**Solution**: The bucket hasn't been created yet. Go back to [Method 1](#method-1-using-sql-fastest---2-minutes) or [Method 2](#method-2-using-dashboard-5-minutes).

### Error: "new row violates row-level security policy"
**Solution**: Storage policies are missing. Run the SQL script from `setup-research-images-bucket.sql`.

### Images upload but can't be viewed
**Solution**:
1. Make sure bucket is marked as **Public**
2. Check the SELECT policy exists for public role
3. Go to Storage → research-images → Configuration → Ensure "Public bucket" toggle is ON

### Error: "JWT expired" or "Invalid JWT"
**Solution**: Your authentication session expired. Log out and log back in.

---

## Verification Checklist

After setup, verify these items:

- [ ] Bucket `research-images` exists in Supabase Dashboard
- [ ] Bucket is marked as "Public" (green indicator)
- [ ] At least 2 policies exist (INSERT for authenticated, SELECT for public)
- [ ] Test script passes: `node test-supabase-storage.js`
- [ ] Can upload image from app: /research/publish → Content step
- [ ] Public URL is accessible in browser

---

## What's Already Done

The application code is **already integrated** and ready to use:

✅ `ResearchImageUpload` component created
✅ Integrated into research publishing flow
✅ Supabase storage client configured
✅ Public URL generation working
✅ Image preview and caption editing implemented

**All you need to do**: Set up the Supabase bucket! 🚀

---

## Files Reference

- `SUPABASE_STORAGE_SETUP.md` - Detailed setup guide
- `setup-research-images-bucket.sql` - One-click SQL setup script
- `test-supabase-storage.js` - Test script to verify setup
- `/src/components/research/ResearchImageUpload.tsx` - Upload component
- `/src/app/(protected)/research/publish/PublishResearchClient.tsx` - Integration

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs/guides/storage
- **Your Project Dashboard**: https://supabase.com/dashboard/project/vnivhesouldxmfetbelw
- **Storage Buckets**: https://supabase.com/dashboard/project/vnivhesouldxmfetbelw/storage/buckets

---

## Quick Commands

```bash
# Test the setup
node test-supabase-storage.js

# Start dev server to test uploads
npm run dev

# Navigate to research publishing
open http://localhost:3000/research/publish
```

---

## Estimated Time
- **SQL Method**: ~2 minutes
- **Dashboard Method**: ~5 minutes
- **Testing**: ~1 minute

**Total**: Less than 10 minutes to get image uploads working! 🎉
