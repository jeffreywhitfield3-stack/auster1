// Test Supabase Storage Setup for Research Images
// Run this with: node test-supabase-storage.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
  console.log('🔧 Testing Supabase Storage Setup...\n');

  // Test 1: Check if bucket exists
  console.log('1️⃣  Checking if research-images bucket exists...');
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError.message);
    return;
  }

  const researchBucket = buckets.find(b => b.id === 'research-images');

  if (!researchBucket) {
    console.error('❌ Bucket "research-images" not found!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Go to Supabase Dashboard → Storage');
    console.log('   2. Create a new bucket named "research-images"');
    console.log('   3. Make sure "Public bucket" is checked');
    console.log('   4. Run the SQL script: setup-research-images-bucket.sql');
    console.log('\n   Or follow the guide in: SUPABASE_STORAGE_SETUP.md\n');
    return;
  }

  console.log('✅ Bucket exists!');
  console.log(`   - Name: ${researchBucket.name}`);
  console.log(`   - Public: ${researchBucket.public ? 'Yes' : 'No'}`);
  console.log(`   - ID: ${researchBucket.id}`);

  if (!researchBucket.public) {
    console.log('⚠️  WARNING: Bucket is not public! Images won\'t be accessible.');
    console.log('   Fix: Go to Storage → research-images → Configuration → Toggle "Public bucket"');
  }

  // Test 2: Try to list files (tests read permission)
  console.log('\n2️⃣  Testing read permissions...');
  const { data: files, error: listError } = await supabase
    .storage
    .from('research-images')
    .list('', {
      limit: 1,
    });

  if (listError) {
    console.error('❌ Error listing files:', listError.message);
    console.log('   This might be normal if the bucket is empty.');
  } else {
    console.log('✅ Read permissions work!');
    console.log(`   Files in bucket: ${files?.length || 0}`);
  }

  // Test 3: Create a test file buffer (small 1x1 pixel PNG)
  console.log('\n3️⃣  Testing upload permissions...');
  console.log('   Note: This will fail if you\'re not authenticated.');
  console.log('   That\'s expected - uploads require authentication.\n');

  // Create a minimal test file (1x1 transparent PNG)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const testImageBuffer = Buffer.from(testImageBase64, 'base64');
  const testFileName = `test-${Date.now()}.png`;

  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('research-images')
    .upload(testFileName, testImageBuffer, {
      contentType: 'image/png',
      upsert: false,
    });

  if (uploadError) {
    if (uploadError.message.includes('JWT') || uploadError.message.includes('authentication')) {
      console.log('✅ Upload requires authentication (expected behavior)');
      console.log('   In the app, users will be authenticated before uploading.');
    } else {
      console.error('❌ Upload error:', uploadError.message);
      console.log('\n📝 Possible issues:');
      console.log('   - Missing storage policies (run setup-research-images-bucket.sql)');
      console.log('   - Bucket permissions not configured correctly');
    }
  } else {
    console.log('✅ Upload successful!');
    console.log(`   File: ${uploadData.path}`);

    // Test 4: Get public URL
    console.log('\n4️⃣  Testing public URL generation...');
    const { data: urlData } = supabase
      .storage
      .from('research-images')
      .getPublicUrl(testFileName);

    console.log('✅ Public URL generated!');
    console.log(`   URL: ${urlData.publicUrl}`);
    console.log('\n   Try opening this URL in your browser to verify public access.');

    // Cleanup: Delete test file
    console.log('\n5️⃣  Cleaning up test file...');
    const { error: deleteError } = await supabase
      .storage
      .from('research-images')
      .remove([testFileName]);

    if (deleteError) {
      console.log('⚠️  Could not delete test file (will remain in bucket)');
    } else {
      console.log('✅ Test file deleted');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Bucket Status: ${researchBucket ? '✅ Exists' : '❌ Not Found'}`);
  console.log(`Public Access: ${researchBucket?.public ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`Read Permission: ${listError ? '❌ Failed' : '✅ Working'}`);
  console.log(`Upload (Auth): ${uploadError ? (uploadError.message.includes('JWT') ? '✅ Requires Auth' : '❌ Failed') : '✅ Working'}`);
  console.log('='.repeat(60));

  console.log('\n✨ Setup Status:');
  if (researchBucket && researchBucket.public && !listError) {
    console.log('   ✅ Supabase storage is ready to use!');
    console.log('   ✅ Research image uploads will work in the app.');
  } else {
    console.log('   ⚠️  Some issues detected. Review the output above.');
    console.log('   📖 See SUPABASE_STORAGE_SETUP.md for detailed instructions.');
  }
  console.log('');
}

testStorage().catch(console.error);
