// src/app/api/models/rate/route.ts
// Rate a model (1-5 stars with optional comment)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/models/rate
 * Rate a model
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
    const { model_id, rating, comment } = body;

    if (!model_id || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: model_id, rating' },
        { status: 400 }
      );
    }

    // Validate rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
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

    // Check if user already rated this model
    const { data: existing } = await supabase
      .from('model_ratings')
      .select('*')
      .eq('user_id', user.id)
      .eq('model_id', model_id);

    if (existing && existing.length > 0) {
      // Update existing rating
      const { error: updateError } = await supabase
        .from('model_ratings')
        .update({
          rating,
          comment: comment || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);

      if (updateError) {
        console.error('[API] Update rating error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update rating' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, updated: true });
    } else {
      // Create new rating
      const { error: createError } = await supabase
        .from('model_ratings')
        .insert({
          user_id: user.id,
          model_id,
          rating,
          comment: comment || null,
        });

      if (createError) {
        console.error('[API] Create rating error:', createError);
        return NextResponse.json(
          { error: 'Failed to create rating' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, updated: false });
    }
  } catch (error) {
    console.error('[API] Rate model error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/models/rate
 * Get user's rating for a model
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
    const model_id = searchParams.get('model_id');

    if (!model_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: model_id' },
        { status: 400 }
      );
    }

    // Get user's rating
    const { data: rating, error: ratingError } = await supabase
      .from('model_ratings')
      .select('*')
      .eq('user_id', user.id)
      .eq('model_id', model_id)
      .single();

    if (ratingError && ratingError.code !== 'PGRST116') {
      console.error('[API] Get rating error:', ratingError);
      return NextResponse.json(
        { error: 'Failed to get rating' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rating: rating || null,
    });
  } catch (error) {
    console.error('[API] Get rating error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/models/rate
 * Delete user's rating for a model
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

    // Delete rating
    const { error: deleteError } = await supabase
      .from('model_ratings')
      .delete()
      .eq('user_id', user.id)
      .eq('model_id', model_id);

    if (deleteError) {
      console.error('[API] Delete rating error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete rating' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Delete rating error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
