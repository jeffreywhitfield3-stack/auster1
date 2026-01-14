// src/app/api/models/saved/route.ts
// List user's saved models

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/models/saved
 * List models saved by the current user
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
    const limit = parseInt(searchParams.get('limit') || '24', 10);
    const offset = (page - 1) * limit;

    // Get saved models with model details (without owner join - FK doesn't exist yet)
    const { data: savedModels, error: fetchError, count } = await supabase
      .from('saved_models')
      .select(`
        id,
        notes,
        created_at,
        model:models(
          id,
          slug,
          name,
          description,
          lab_scope,
          tags,
          difficulty,
          visibility,
          total_runs,
          saved_count,
          avg_rating,
          created_at,
          owner_id
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error('[API] Fetch saved models error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch saved models' },
        { status: 500 }
      );
    }

    // Transform data to match expected format
    const models = (savedModels || []).map(saved => ({
      ...saved.model,
      saved_at: saved.created_at,
      saved_notes: saved.notes,
      saved_id: saved.id,
    }));

    return NextResponse.json({
      models,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[API] Saved models list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
