// src/app/api/models/[slug]/comments/[commentId]/like/route.ts
// Like/unlike a comment

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/models/[slug]/comments/[commentId]/like
 * Like a comment
 */
export async function POST(
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

    // Verify comment exists
    const { data: comment, error: commentError } = await supabase
      .from('model_comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Create like
    const { error: likeError } = await supabase
      .from('comment_likes')
      .insert({
        user_id: user.id,
        comment_id: commentId,
      });

    if (likeError) {
      // Already liked (unique constraint violation)
      if (likeError.code === '23505') {
        return NextResponse.json(
          { error: 'Already liked' },
          { status: 409 }
        );
      }

      console.error('[API] Like comment error:', likeError);
      return NextResponse.json(
        { error: 'Failed to like comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Like comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/models/[slug]/comments/[commentId]/like
 * Unlike a comment
 */
export async function DELETE(
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

    // Remove like
    const { error: unlikeError } = await supabase
      .from('comment_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('comment_id', commentId);

    if (unlikeError) {
      console.error('[API] Unlike comment error:', unlikeError);
      return NextResponse.json(
        { error: 'Failed to unlike comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Unlike comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
