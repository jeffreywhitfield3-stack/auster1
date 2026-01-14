// src/app/api/models/publish/route.ts
// Publish a model run as a shareable artifact

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/models/publish
 * Publish a model run as an artifact
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
    const { run_id, title, description } = body;

    if (!run_id || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: run_id, title' },
        { status: 400 }
      );
    }

    // Fetch the run to verify ownership
    const { data: run, error: runError } = await supabase
      .from('model_runs')
      .select(`
        *,
        version:model_versions!model_runs_model_version_id_fkey(
          *,
          model:models!model_versions_model_id_fkey(*)
        )
      `)
      .eq('id', run_id)
      .eq('user_id', user.id)
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: 'Run not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify run was successful
    if (run.status !== 'success') {
      return NextResponse.json(
        { error: 'Can only publish successful runs' },
        { status: 400 }
      );
    }

    // Generate unique slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data: existing } = await supabase
        .from('published_artifacts')
        .select('id')
        .eq('slug', slug);

      if (!existing || existing.length === 0) {
        break;
      }

      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Create published artifact
    const { data: artifact, error: artifactError } = await supabase
      .from('published_artifacts')
      .insert({
        user_id: user.id,
        model_id: run.version.model.id,
        model_version_id: run.model_version_id,
        run_id: run.id,
        slug,
        title,
        description: description || null,
        inputs_json: run.inputs_json,
        outputs_json: run.outputs_json,
        visibility: 'public', // Default to public
      })
      .select()
      .single();

    if (artifactError) {
      console.error('[API] Artifact creation error:', artifactError);
      return NextResponse.json(
        { error: 'Failed to publish artifact' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      artifact,
      url: `/artifacts/${slug}`,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Publish artifact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/models/publish
 * List user's published artifacts
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Fetch artifacts
    const offset = (page - 1) * limit;

    const { data: artifacts, error, count } = await supabase
      .from('published_artifacts')
      .select(`
        *,
        model:models!published_artifacts_model_id_fkey(id, slug, name),
        user:users!published_artifacts_user_id_fkey(email, display_name)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[API] Fetch artifacts error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch artifacts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      artifacts: artifacts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[API] Fetch artifacts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
