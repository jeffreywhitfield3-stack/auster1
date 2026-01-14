// src/app/api/models/fork/route.ts
// Fork a model to create a copy

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/models/fork
 * Fork an existing model
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
    const { model_slug } = body;

    if (!model_slug) {
      return NextResponse.json(
        { error: 'Missing required field: model_slug' },
        { status: 400 }
      );
    }

    // Fetch source model with latest version
    const { data: sourceModel, error: fetchError } = await supabase
      .from('models')
      .select(`
        *,
        versions:model_versions!model_versions_model_id_fkey(*)
      `)
      .eq('slug', model_slug)
      .eq('visibility', 'public') // Can only fork public models
      .single();

    if (fetchError || !sourceModel) {
      return NextResponse.json(
        { error: 'Model not found or not forkable' },
        { status: 404 }
      );
    }

    // Get latest version
    const versions = sourceModel.versions || [];
    versions.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (versions.length === 0) {
      return NextResponse.json(
        { error: 'No versions available to fork' },
        { status: 400 }
      );
    }

    const sourceVersion = versions[0];

    // Generate new slug
    const baseSlug = `${sourceModel.slug}-fork`;
    let newSlug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (true) {
      const { data: existing } = await supabase
        .from('models')
        .select('id')
        .eq('slug', newSlug)
        .eq('owner_id', user.id);

      if (!existing || existing.length === 0) {
        break;
      }

      counter++;
      newSlug = `${baseSlug}-${counter}`;
    }

    // Create forked model
    const { data: forkedModel, error: createError } = await supabase
      .from('models')
      .insert({
        owner_id: user.id,
        slug: newSlug,
        name: `${sourceModel.name} (Fork)`,
        description: sourceModel.description,
        lab_scope: sourceModel.lab_scope,
        visibility: 'private', // Forks start as private
        tags: sourceModel.tags,
        difficulty: sourceModel.difficulty,
        is_template: false,
      })
      .select()
      .single();

    if (createError) {
      console.error('[API] Fork model creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create forked model' },
        { status: 500 }
      );
    }

    // Create version for forked model
    const { data: forkedVersion, error: versionError } = await supabase
      .from('model_versions')
      .insert({
        model_id: forkedModel.id,
        version: '1.0.0',
        runtime: sourceVersion.runtime,
        dsl_json: sourceVersion.dsl_json,
        input_schema: sourceVersion.input_schema,
        output_schema: sourceVersion.output_schema,
      })
      .select()
      .single();

    if (versionError) {
      console.error('[API] Fork version creation error:', versionError);
      // Rollback model creation
      await supabase.from('models').delete().eq('id', forkedModel.id);
      return NextResponse.json(
        { error: 'Failed to create forked version' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      model: forkedModel,
      version: forkedVersion,
      sourceModelId: sourceModel.id,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Fork error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
