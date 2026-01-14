# Supabase Storage Setup for Research Images

## Overview
This guide will help you create and configure the `research-images` storage bucket in Supabase for the research publishing feature.

## Your Supabase Project Details
- **Project URL**: `https://vnivhesouldxmfetbelw.supabase.co`
- **Project Reference**: `vnivhesouldxmfetbelw`

---

## Step-by-Step Setup

### 1. Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Log in to your account
3. Select your project: **vnivhesouldxmfetbelw**

### 2. Navigate to Storage

1. In the left sidebar, click on **Storage**
2. You should see the "Buckets" page

### 3. Create the Research Images Bucket

1. Click the **"New bucket"** button (top right)
2. Fill in the bucket details:
   - **Name**: `research-images`
   - **Public bucket**: ✅ **Check this box** (IMPORTANT - images need to be publicly accessible)
   - **File size limit**: Leave default or set to `10MB` (optional)
   - **Allowed MIME types**: Leave empty or set to `image/*` (optional)

3. Click **"Create bucket"**

### 4. Configure Bucket Policies (Important!)

After creating the bucket, you need to set up proper access policies:

#### Option A: Using the Supabase Dashboard (Recommended)

1. Click on the `research-images` bucket you just created
2. Go to the **Policies** tab
3. Click **"New Policy"**
4. You need to create **TWO** policies:

**Policy 1: Allow Authenticated Users to Upload**
```sql
-- Policy Name: Allow authenticated users to upload
-- Operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Allow authenticated users to upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'research-images');
```

**Policy 2: Allow Public Read Access**
```sql
-- Policy Name: Allow public read access
-- Operation: SELECT
-- Target roles: public

CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'research-images');
```

#### Option B: Using SQL Editor (Alternative)

If you prefer using SQL directly:

1. Go to **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Paste and run the following SQL:

```sql
-- Create the research-images bucket (if not already created)
INSERT INTO storage.buckets (id, name, public)
VALUES ('research-images', 'research-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload research images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'research-images');

-- Allow public read access to research images
CREATE POLICY "Allow public read access to research images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'research-images');

-- Optional: Allow authenticated users to delete their own images
CREATE POLICY "Allow users to delete their own research images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'research-images' AND auth.uid()::text = owner);
```

4. Click **"Run"** to execute

### 5. Verify the Setup

1. Go back to **Storage** → **research-images** bucket
2. Click on **Policies** tab
3. You should see at least 2 policies:
   - ✅ INSERT policy for authenticated users
   - ✅ SELECT policy for public access

### 6. Test the Upload (Optional)

You can test the bucket by uploading a file manually:

1. Click on the `research-images` bucket
2. Click **"Upload file"**
3. Select any image file
4. After upload, click on the file
5. Copy the **Public URL**
6. Open the URL in a new tab - you should see the image

---

## Troubleshooting

### Issue: "new row violates row-level security policy"

**Solution**: The bucket policies are not set up correctly. Make sure you ran the policy creation SQL or added policies via the dashboard.

### Issue: "Bucket not found"

**Solution**:
1. Make sure the bucket name is exactly `research-images` (lowercase, with hyphen)
2. The bucket must be created before the policies

### Issue: Images upload but can't be accessed publicly

**Solution**:
1. Ensure the bucket is marked as **Public** (checkbox when creating)
2. Ensure the SELECT policy for public role exists
3. You can make a bucket public after creation by going to Storage → research-images → Configuration → toggle "Public bucket"

### Issue: "Access denied" when uploading

**Solution**:
1. Make sure you're logged in (authenticated)
2. Check that the INSERT policy for authenticated users exists
3. Verify the policy's WITH CHECK condition is correct

---

## Security Considerations

### Current Setup
- ✅ **Public Read**: Anyone can view images via public URLs
- ✅ **Authenticated Upload**: Only logged-in users can upload
- ✅ **User Ownership**: Files are associated with the uploading user

### Optional Enhancements

If you want more control, you can add these policies:

**1. Limit file size (10MB max):**
```sql
CREATE POLICY "Limit file size to 10MB"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'research-images' AND
  (SELECT size FROM storage.objects WHERE id = id) < 10485760
);
```

**2. Restrict to image files only:**
```sql
CREATE POLICY "Only allow image uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'research-images' AND
  (SELECT content_type FROM storage.objects WHERE id = id) LIKE 'image/%'
);
```

**3. Allow users to delete only their own images:**
```sql
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'research-images' AND
  owner = auth.uid()::text
);
```

---

## Quick Reference SQL (Copy-Paste Ready)

If you want to set everything up at once, run this complete SQL script:

```sql
-- 1. Create bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('research-images', 'research-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "authenticated_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'research-images');

-- 3. Allow public read access
CREATE POLICY IF NOT EXISTS "public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'research-images');

-- 4. Allow users to delete their own uploads
CREATE POLICY IF NOT EXISTS "owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'research-images' AND owner = auth.uid()::text);
```

---

## Verification Checklist

After setup, verify these items:

- [ ] Bucket `research-images` exists
- [ ] Bucket is marked as "Public"
- [ ] INSERT policy for authenticated users exists
- [ ] SELECT policy for public access exists
- [ ] Test upload works (try uploading from the app)
- [ ] Public URL is accessible (open image URL in browser)

---

## Application Integration

The app is already configured to use this bucket:

**File**: `/src/components/research/ResearchImageUpload.tsx` (line 43)
```typescript
const up = await supabase.storage.from("research-images").upload(path, file, {
  cacheControl: "3600",
  upsert: false,
  contentType: file.type || undefined,
});
```

**File**: `/src/components/research/ResearchImageUpload.tsx` (line 51)
```typescript
const pub = supabase.storage.from("research-images").getPublicUrl(path);
```

Once the bucket is set up, the integration will work automatically!

---

## Support

If you encounter any issues:

1. Check the Supabase logs: Dashboard → Logs → Storage
2. Verify your Supabase credentials in `.env.local`
3. Test the Supabase connection in your app first

The bucket setup should take less than 5 minutes to complete!
