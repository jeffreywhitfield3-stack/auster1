// src/app/api/models/route.ts
// List and create models

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import type { Model, LabScope, ModelVisibility } from '@/types/models';

export const dynamic = 'force-dynamic';

/**
 * GET /api/models
 * List models with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const searchParams = request.nextUrl.searchParams;

    // Get auth user (optional for public models)
    const { data: { user } } = await supabase.auth.getUser();

    // Parse query parameters
    const lab = searchParams.get('lab') as LabScope | null;
    const search = searchParams.get('search');
    const tags = searchParams.getAll('tags');
    const difficulty = searchParams.get('difficulty');
    const sort = searchParams.get('sort') || 'popular'; // popular, newest, top_rated
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '24', 10);

    // Build query - simplified without owner join since FK doesn't exist yet
    let query = supabase
      .from('models')
      .select('*', { count: 'exact' });

    // Filter by visibility (public or user's own models)
    if (user) {
      query = query.or(`visibility.eq.public,owner_id.eq.${user.id}`);
    } else {
      query = query.eq('visibility', 'public');
    }

    // Filter by lab scope
    if (lab) {
      query = query.or(`lab_scope.eq.${lab},lab_scope.eq.both`);
    }

    // Search by name/description
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filter by tags
    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }

    // Filter by difficulty
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    // Sort
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'top_rated':
        query = query.order('avg_rating', { ascending: false, nullsFirst: false });
        break;
      case 'popular':
      default:
        query = query.order('total_runs', { ascending: false });
        break;
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: models, error, count } = await query;

    if (error) {
      console.error('[API] Models list error:', error);
      console.error('[API] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        {
          error: 'Failed to fetch models',
          details: error.message,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    console.log('[API] Models fetched successfully:', {
      count: models?.length || 0,
      total: count,
      page,
      limit
    });

    return NextResponse.json({
      models: models || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[API] Models list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/models
 * Create a new model (authenticated users only)
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

    // Validate required fields
    const { name, description, lab_scope, dsl_json, input_schema } = body;

    if (!name || !description || !lab_scope || !dsl_json || !input_schema) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, lab_scope, dsl_json, input_schema' },
        { status: 400 }
      );
    }

    // Validate DSL
    const { validateDslModel } = await import('@/lib/models/engine/validator');
    const validation = validateDslModel(dsl_json);

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid DSL', details: validation.errors },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Create model
    const { data: model, error: modelError } = await supabase
      .from('models')
      .insert({
        owner_id: user.id,
        slug,
        name,
        description,
        lab_scope,
        visibility: body.visibility || 'private',
        tags: body.tags || [],
        difficulty: body.difficulty || 'basic',
        is_template: body.is_template || false,
      })
      .select()
      .single();

    if (modelError) {
      console.error('[API] Model creation error:', modelError);
      return NextResponse.json(
        { error: 'Failed to create model' },
        { status: 500 }
      );
    }

    // Create initial version
    const { data: version, error: versionError } = await supabase
      .from('model_versions')
      .insert({
        model_id: model.id,
        version: '1.0.0',
        runtime: 'dsl',
        dsl_json,
        input_schema,
        output_schema: dsl_json.outputs,
      })
      .select()
      .single();

    if (versionError) {
      console.error('[API] Version creation error:', versionError);
      // Rollback model creation
      await supabase.from('models').delete().eq('id', model.id);
      return NextResponse.json(
        { error: 'Failed to create model version' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      model,
      version,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Model creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
