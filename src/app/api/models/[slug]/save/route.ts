// src/app/api/models/[slug]/save/route.ts
// Save or unsave a model

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/models/[slug]/save
 * Save a model to user's saved models
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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

    const { slug } = await params;

    // Get model by slug
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id')
      .eq('slug', slug)
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Parse body for optional notes
    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    // Save the model
    const { data: savedModel, error: saveError } = await supabase
      .from('saved_models')
      .insert({
        user_id: user.id,
        model_id: model.id,
        notes: notes || null,
      })
      .select()
      .single();

    if (saveError) {
      // Check if already saved
      if (saveError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Model already saved' },
          { status: 409 }
        );
      }

      console.error('[API] Save model error:', saveError);
      return NextResponse.json(
        { error: 'Failed to save model' },
        { status: 500 }
      );
    }

    return NextResponse.json({ savedModel }, { status: 201 });
  } catch (error) {
    console.error('[API] Save model error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/models/[slug]/save
 * Remove a model from user's saved models
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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

    const { slug } = await params;

    // Get model by slug
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id')
      .eq('slug', slug)
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Delete the saved model
    const { error: deleteError } = await supabase
      .from('saved_models')
      .delete()
      .eq('user_id', user.id)
      .eq('model_id', model.id);

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

/**
 * GET /api/models/[slug]/save
 * Check if user has saved this model
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await supabaseServer();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ saved: false });
    }

    const { slug } = await params;

    // Get model by slug
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id')
      .eq('slug', slug)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ saved: false });
    }

    // Check if saved
    const { data: savedModel } = await supabase
      .from('saved_models')
      .select('id, notes')
      .eq('user_id', user.id)
      .eq('model_id', model.id)
      .single();

    return NextResponse.json({
      saved: !!savedModel,
      notes: savedModel?.notes || null,
    });
  } catch (error) {
    console.error('[API] Check saved model error:', error);
    return NextResponse.json({ saved: false });
  }
}
