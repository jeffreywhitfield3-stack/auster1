-- Supabase Storage Setup for Research Images
-- Run this script in your Supabase SQL Editor to set up the research-images bucket
-- Dashboard URL: https://supabase.com/dashboard/project/vnivhesouldxmfetbelw/sql

-- ============================================================================
-- 1. CREATE BUCKET
-- ============================================================================
-- Create the research-images bucket with public access
-- If bucket already exists, it will be updated to be public

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'research-images',
  'research-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id)
DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']::text[];

-- ============================================================================
-- 2. STORAGE POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "public_read" ON storage.objects;
DROP POLICY IF EXISTS "owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "owner_update" ON storage.objects;

-- Policy 1: Allow authenticated users to upload images
CREATE POLICY "authenticated_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'research-images'
);

-- Policy 2: Allow public read access to all images
CREATE POLICY "public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'research-images');

-- Policy 3: Allow users to delete only their own images
CREATE POLICY "owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'research-images' AND
  owner = auth.uid()::text
);

-- Policy 4: Allow users to update only their own images (optional)
CREATE POLICY "owner_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'research-images' AND
  owner = auth.uid()::text
);

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Check that bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
WHERE id = 'research-images';

-- Check that policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND (
    policyname LIKE '%research%' OR
    policyname IN ('authenticated_upload', 'public_read', 'owner_delete', 'owner_update')
  )
ORDER BY policyname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Research images bucket setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Bucket Details:';
  RAISE NOTICE '  - Name: research-images';
  RAISE NOTICE '  - Public: Yes';
  RAISE NOTICE '  - Max file size: 10MB';
  RAISE NOTICE '  - Allowed types: PNG, JPEG, JPG, GIF, WEBP';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies Created:';
  RAISE NOTICE '  ✅ authenticated_upload - Authenticated users can upload';
  RAISE NOTICE '  ✅ public_read - Public read access';
  RAISE NOTICE '  ✅ owner_delete - Users can delete their own images';
  RAISE NOTICE '  ✅ owner_update - Users can update their own images';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Verify bucket exists: Storage → Buckets → research-images';
  RAISE NOTICE '  2. Test upload from your application';
  RAISE NOTICE '  3. Verify public URL access works';
END $$;
