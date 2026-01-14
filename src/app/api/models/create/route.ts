// src/app/api/models/create/route.ts
// API endpoint to create a new model

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import type { LabScope, ModelDifficulty, ModelRuntime, ModelVisibility } from '@/types/models';

export const dynamic = 'force-dynamic';

/**
 * POST /api/models/create
 * Create a new model with code
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      lab_scope,
      tags,
      difficulty,
      runtime,
      code,
      input_schema,
      output_schema,
      visibility,
      is_template,
    } = body;

    // Validate required fields
    if (!name || !description || !code) {
      console.error('[API] Missing required fields:', { name: !!name, description: !!description, code: !!code });
      return NextResponse.json(
        { error: 'Missing required fields: name, description, code' },
        { status: 400 }
      );
    }

    if (!input_schema || !output_schema) {
      console.error('[API] Missing required schemas:', { input_schema: !!input_schema, output_schema: !!output_schema });
      return NextResponse.json(
        { error: 'Missing required schemas: input_schema, output_schema' },
        { status: 400 }
      );
    }

    // Validate enums
    const validLabScopes: (LabScope | 'both')[] = ['econ', 'derivatives', 'both'];
    const validDifficulties: ModelDifficulty[] = ['basic', 'intermediate', 'advanced'];
    const validRuntimes: ModelRuntime[] = ['dsl', 'python', 'js'];
    const validVisibilities: ModelVisibility[] = ['private', 'unlisted', 'public'];

    if (!validLabScopes.includes(lab_scope)) {
      console.error('[API] Invalid lab_scope:', lab_scope, 'Valid values:', validLabScopes);
      return NextResponse.json(
        { error: 'Invalid lab_scope' },
        { status: 400 }
      );
    }

    if (!validDifficulties.includes(difficulty)) {
      console.error('[API] Invalid difficulty:', difficulty, 'Valid values:', validDifficulties);
      return NextResponse.json(
        { error: 'Invalid difficulty' },
        { status: 400 }
      );
    }

    if (!validRuntimes.includes(runtime)) {
      console.error('[API] Invalid runtime:', runtime, 'Valid values:', validRuntimes);
      return NextResponse.json(
        { error: 'Invalid runtime' },
        { status: 400 }
      );
    }

    if (!validVisibilities.includes(visibility)) {
      console.error('[API] Invalid visibility:', visibility, 'Valid values:', validVisibilities);
      return NextResponse.json(
        { error: 'Invalid visibility' },
        { status: 400 }
      );
    }

    // Generate unique slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (true) {
      const { data: existing } = await supabase
        .from('models')
        .select('id')
        .eq('slug', slug);

      if (!existing || existing.length === 0) {
        break;
      }

      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Create model
    console.log('[API] Creating model with data:', {
      owner_id: user.id,
      slug,
      name,
      description,
      lab_scope,
      visibility,
      tags: tags || [],
      difficulty,
      is_template: is_template || false,
    });

    const { data: model, error: createError } = await supabase
      .from('models')
      .insert({
        owner_id: user.id,
        slug,
        name,
        description,
        lab_scope,
        visibility,
        tags: tags || [],
        difficulty,
        is_template: is_template || false,
      })
      .select()
      .single();

    if (createError) {
      console.error('[API] Model creation error:', createError);
      console.error('[API] Model creation error details:', {
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        code: createError.code,
      });
      return NextResponse.json(
        { error: 'Failed to create model', details: createError.message },
        { status: 500 }
      );
    }

    console.log('[API] Model created successfully:', model.id);

    // Create initial version
    console.log('[API] Creating model version with data:', {
      model_id: model.id,
      version: 1,
      runtime,
      code_bundle_length: code?.length || 0,
      has_input_schema: !!input_schema,
      has_output_schema: !!output_schema,
      dsl_json: runtime === 'dsl' ? 'provided' : null,
      is_active: true,
    });

    const { data: version, error: versionError } = await supabase
      .from('model_versions')
      .insert({
        model_id: model.id,
        version: 1, // INTEGER: version 1, not "1.0.0"
        runtime,
        code_bundle: code,
        input_schema,
        output_schema,
        dsl_json: runtime === 'dsl' ? input_schema : null,
        dependencies: [],
        is_active: true,
        changelog: 'Initial version',
      })
      .select()
      .single();

    if (versionError) {
      console.error('[API] Version creation error:', versionError);
      console.error('[API] Version creation error details:', {
        message: versionError.message,
        details: versionError.details,
        hint: versionError.hint,
        code: versionError.code,
      });
      // Rollback model creation
      console.log('[API] Rolling back model creation due to version error');
      await supabase.from('models').delete().eq('id', model.id);
      return NextResponse.json(
        { error: 'Failed to create model version', details: versionError.message },
        { status: 500 }
      );
    }

    console.log('[API] Model version created successfully:', version.id);

    console.log('[API] Model creation complete:', { model_id: model.id, version_id: version.id });

    return NextResponse.json(
      {
        model,
        version,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Create model error:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
