// src/app/api/models/[slug]/comments/[commentId]/route.ts
// Update and delete individual comments

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/models/[slug]/comments/[commentId]
 * Update a comment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; commentId: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { commentId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content } = body;

    // Validate content
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Comment must be 2000 characters or less' },
        { status: 400 }
      );
    }

    // Update comment (RLS will ensure user owns it)
    const { data: comment, error: updateError } = await supabase
      .from('model_comments')
      .update({
        content: content.trim(),
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !comment) {
      console.error('[API] Update comment error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update comment or not authorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('[API] Update comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/models/[slug]/comments/[commentId]
 * Delete a comment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; commentId: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { slug, commentId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get comment to check ownership
    const { data: comment, error: commentError } = await supabase
      .from('model_comments')
      .select('user_id, model_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user is comment owner or model owner
    const { data: model } = await supabase
      .from('models')
      .select('owner_id')
      .eq('id', comment.model_id)
      .single();

    const isCommentOwner = comment.user_id === user.id;
    const isModelOwner = model?.owner_id === user.id;

    if (!isCommentOwner && !isModelOwner) {
      return NextResponse.json(
        { error: 'Not authorized to delete this comment' },
        { status: 403 }
      );
    }

    // Delete comment
    const { error: deleteError } = await supabase
      .from('model_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('[API] Delete comment error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Delete comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
