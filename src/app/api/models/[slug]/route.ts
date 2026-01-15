// src/app/api/models/[slug]/route.ts
// Get, update, delete specific model

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/models/[slug]
 * Get model details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { slug } = await params;

    // Get auth user (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch model with latest version (without owner join - FK doesn't exist yet)
    let query = supabase
      .from('models')
      .select(`
        *,
        versions:model_versions(*)
      `)
      .eq('slug', slug);

    // Filter by visibility
    if (user) {
      query = query.or(`visibility.eq.public,owner_id.eq.${user.id}`);
    } else {
      query = query.eq('visibility', 'public');
    }

    const { data: models, error } = await query;

    if (error) {
      console.error('[API] Model fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch model' },
        { status: 500 }
      );
    }

    if (!models || models.length === 0) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    const model = models[0];

    // Sort versions (newest first)
    model.versions?.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Fetch owner's username from user_profiles if it exists
    if (model.owner_id) {
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('username, display_name')
        .eq('id', model.owner_id)
        .single();

      if (ownerProfile) {
        model.owner_username = ownerProfile.username;
        model.owner_display_name = ownerProfile.display_name;
      }
    }

    return NextResponse.json({ model });
  } catch (error) {
    console.error('[API] Model fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/models/[slug]
 * Update model metadata (owner only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { slug } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch model to verify ownership
    const { data: models, error: fetchError } = await supabase
      .from('models')
      .select('*')
      .eq('slug', slug)
      .eq('owner_id', user.id);

    if (fetchError || !models || models.length === 0) {
      return NextResponse.json(
        { error: 'Model not found or unauthorized' },
        { status: 404 }
      );
    }

    const model = models[0];
    const body = await request.json();

    // Update allowed fields
    const updates: any = {};

    if (body.name) updates.name = body.name;
    if (body.description) updates.description = body.description;
    if (body.tags) updates.tags = body.tags;
    if (body.visibility) updates.visibility = body.visibility;
    if (body.difficulty) updates.difficulty = body.difficulty;

    updates.updated_at = new Date().toISOString();

    const { data: updatedModel, error: updateError } = await supabase
      .from('models')
      .update(updates)
      .eq('id', model.id)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Model update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update model' },
        { status: 500 }
      );
    }

    return NextResponse.json({ model: updatedModel });
  } catch (error) {
    console.error('[API] Model update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/models/[slug]
 * Delete model (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { slug } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch model to verify ownership
    const { data: models, error: fetchError } = await supabase
      .from('models')
      .select('*')
      .eq('slug', slug)
      .eq('owner_id', user.id);

    if (fetchError || !models || models.length === 0) {
      return NextResponse.json(
        { error: 'Model not found or unauthorized' },
        { status: 404 }
      );
    }

    const model = models[0];

    // Delete model (cascade will delete versions, runs, etc.)
    const { error: deleteError } = await supabase
      .from('models')
      .delete()
      .eq('id', model.id);

    if (deleteError) {
      console.error('[API] Model deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete model' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Model deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
