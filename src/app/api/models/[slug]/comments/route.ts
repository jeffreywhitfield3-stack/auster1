// src/app/api/models/[slug]/comments/route.ts
// Get and create comments on a model

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/models/[slug]/comments
 * Get comments for a model
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { slug } = await params;

    // Get current user (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Get model
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id')
      .eq('slug', slug)
      .eq('visibility', 'public')
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Get all comments for this model (top-level only, we'll nest replies)
    const { data: comments, error: commentsError } = await supabase
      .from('model_comments')
      .select(`
        *,
        user:user_profiles!model_comments_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('model_id', model.id)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('[API] Fetch comments error:', commentsError);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // Get replies for each comment
    const { data: replies, error: repliesError } = await supabase
      .from('model_comments')
      .select(`
        *,
        user:user_profiles!model_comments_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('model_id', model.id)
      .not('parent_comment_id', 'is', null)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('[API] Fetch replies error:', repliesError);
    }

    // Get like counts and user's likes
    const commentIds = [...(comments || []), ...(replies || [])].map(c => c.id);

    const likesPromises = commentIds.map(async (commentId) => {
      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId);

      let userHasLiked = false;
      if (user) {
        const { data } = await supabase
          .from('comment_likes')
          .select('*')
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .single();
        userHasLiked = !!data;
      }

      return { commentId, like_count: count || 0, user_has_liked: userHasLiked };
    });

    const likesData = await Promise.all(likesPromises);
    const likesMap = new Map(likesData.map(l => [l.commentId, l]));

    // Organize replies under their parent comments
    const repliesMap = new Map<string, any[]>();
    (replies || []).forEach(reply => {
      if (!repliesMap.has(reply.parent_comment_id)) {
        repliesMap.set(reply.parent_comment_id, []);
      }
      repliesMap.get(reply.parent_comment_id)!.push({
        ...reply,
        ...likesMap.get(reply.id),
      });
    });

    // Build final comment tree
    const commentsWithReplies = (comments || []).map(comment => ({
      ...comment,
      ...likesMap.get(comment.id),
      replies: repliesMap.get(comment.id) || [],
    }));

    return NextResponse.json({
      comments: commentsWithReplies,
      total: commentsWithReplies.length,
    });
  } catch (error) {
    console.error('[API] Comments fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/models/[slug]/comments
 * Create a comment on a model
 */
export async function POST(
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

    // Get model
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id')
      .eq('slug', slug)
      .eq('visibility', 'public')
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content, parent_comment_id } = body;

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

    // If replying, verify parent comment exists
    if (parent_comment_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('model_comments')
        .select('id')
        .eq('id', parent_comment_id)
        .eq('model_id', model.id)
        .single();

      if (parentError || !parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    // Create comment (will trigger notification via database trigger)
    const { data: comment, error: commentError } = await supabase
      .from('model_comments')
      .insert({
        model_id: model.id,
        user_id: user.id,
        content: content.trim(),
        parent_comment_id: parent_comment_id || null,
      })
      .select(`
        *,
        user:user_profiles!model_comments_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (commentError) {
      console.error('[API] Create comment error:', commentError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('[API] Create comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
