// src/lib/models/seeds/seed.ts
// Seed script to populate models database

import { createClient } from '@supabase/supabase-js';
import { econTemplates } from './econ-templates';
import { derivativesTemplates } from './derivatives-templates';

const SYSTEM_USER_EMAIL = 'system@auster.com';

async function seedModels() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('Starting model seeding...\n');

  // Get or create system user
  let systemUserId: string;

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', SYSTEM_USER_EMAIL)
    .single();

  if (existingUser) {
    systemUserId = existingUser.id;
    console.log(`Using existing system user: ${systemUserId}`);
  } else {
    // Create system user in auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: SYSTEM_USER_EMAIL,
      email_confirm: true,
      user_metadata: {
        display_name: 'Auster System',
      },
    });

    if (authError || !authUser.user) {
      throw new Error(`Failed to create system user: ${authError?.message}`);
    }

    systemUserId = authUser.user.id;
    console.log(`Created system user: ${systemUserId}`);
  }

  const allTemplates = [...econTemplates, ...derivativesTemplates];

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const template of allTemplates) {
    try {
      console.log(`Processing: ${template.name} (${template.slug})...`);

      // Check if model already exists
      const { data: existing } = await supabase
        .from('models')
        .select('id')
        .eq('slug', template.slug)
        .single();

      if (existing) {
        console.log(`  ⏭️  Skipped (already exists)\n`);
        skipped++;
        continue;
      }

      // Create model
      const { data: model, error: modelError } = await supabase
        .from('models')
        .insert({
          owner_id: systemUserId,
          slug: template.slug,
          name: template.name,
          description: template.description,
          lab_scope: template.lab_scope,
          visibility: 'public',
          tags: template.tags,
          difficulty: template.difficulty,
          is_template: true,
        })
        .select()
        .single();

      if (modelError) {
        throw new Error(`Model creation failed: ${modelError.message}`);
      }

      console.log(`  ✅ Model created: ${model.id}`);

      // Create version
      const { data: version, error: versionError } = await supabase
        .from('model_versions')
        .insert({
          model_id: model.id,
          version: '1.0.0',
          runtime: 'dsl',
          dsl_json: template.dsl_json,
          input_schema: template.input_schema,
          output_schema: template.dsl_json.outputs,
        })
        .select()
        .single();

      if (versionError) {
        throw new Error(`Version creation failed: ${versionError.message}`);
      }

      console.log(`  ✅ Version created: ${version.id}\n`);
      created++;
    } catch (error) {
      console.error(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
      errors++;
    }
  }

  console.log('\n=== Seeding Complete ===');
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total: ${allTemplates.length}`);
}

// Run if called directly
if (require.main === module) {
  seedModels()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

export { seedModels };
