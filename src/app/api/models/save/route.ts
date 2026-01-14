// src/app/api/models/save/route.ts
// Save/unsave (bookmark) a model

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/models/save
 * Save (bookmark) a model
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
    const { model_id } = body;

    if (!model_id) {
      return NextResponse.json(
        { error: 'Missing required field: model_id' },
        { status: 400 }
      );
    }

    // Verify model exists and is accessible
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id')
      .eq('id', model_id)
      .or(`visibility.eq.public,owner_id.eq.${user.id}`)
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from('model_saves')
      .select('*')
      .eq('user_id', user.id)
      .eq('model_id', model_id);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Model already saved' },
        { status: 400 }
      );
    }

    // Save model
    const { error: saveError } = await supabase
      .from('model_saves')
      .insert({
        user_id: user.id,
        model_id,
      });

    if (saveError) {
      console.error('[API] Save model error:', saveError);
      return NextResponse.json(
        { error: 'Failed to save model' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Save model error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/models/save
 * Unsave (remove bookmark) a model
 */
export async function DELETE(request: NextRequest) {
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
    const model_id = searchParams.get('model_id');

    if (!model_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: model_id' },
        { status: 400 }
      );
    }

    // Unsave model
    const { error: deleteError } = await supabase
      .from('model_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('model_id', model_id);

    if (deleteError) {
      console.error('[API] Unsave model error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unsave model' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Unsave model error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
