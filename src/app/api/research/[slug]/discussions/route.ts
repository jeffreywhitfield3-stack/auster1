import { supabaseServer } from "@/lib/supabase/server";

import { NextResponse } from 'next/server';

// GET discussions for a research object
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { slug } = await params;

    // Get research object ID from slug
    const { data: research } = await supabase
      .from('research_objects')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (!research) {
      return NextResponse.json(
        { error: 'Research not found' },
        { status: 404 }
      );
    }

    // Fetch discussions with author info
    const { data: discussions, error } = await supabase
      .from('discussions')
      .select(`
        *,
        author:researcher_profiles!author_id (
          id,
          display_name,
          slug,
          avatar_url,
          tier
        )
      `)
      .eq('research_object_id', research.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch discussions error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch discussions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      discussions: discussions || []
    });

  } catch (error) {
    console.error('Discussions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST new discussion
export async function POST(
  request: Request,
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

    // Get researcher profile
    const { data: profile } = await supabase
      .from('researcher_profiles')
      .select('id, tier')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.tier === 'observer') {
      return NextResponse.json(
        { error: 'Only contributors can create discussions' },
        { status: 403 }
      );
    }

    // Get research object ID from slug
    const { data: research } = await supabase
      .from('research_objects')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (!research) {
      return NextResponse.json(
        { error: 'Research not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { content, discussion_type, parent_id } = body;

    // Validate required fields
    if (!content || !discussion_type) {
      return NextResponse.json(
        { error: 'Missing required fields: content, discussion_type' },
        { status: 400 }
      );
    }

    // Calculate thread depth if replying
    let thread_depth = 0;
    if (parent_id) {
      const { data: parentDiscussion } = await supabase
        .from('discussions')
        .select('thread_depth')
        .eq('id', parent_id)
        .single();

      if (parentDiscussion) {
        thread_depth = parentDiscussion.thread_depth + 1;
      }
    }

    // Insert discussion
    const { data: discussion, error: insertError } = await supabase
      .from('discussions')
      .insert({
        research_object_id: research.id,
        author_id: profile.id,
        parent_id: parent_id || null,
        thread_depth,
        content,
        discussion_type,
        status: 'active'
      })
      .select(`
        *,
        author:researcher_profiles!author_id (
          id,
          display_name,
          slug,
          avatar_url,
          tier
        )
      `)
      .single();

    if (insertError || !discussion) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create discussion' },
        { status: 500 }
      );
    }

    // Update discussion counts
    await supabase.rpc('increment_discussion_count', { research_id: research.id });
    await supabase.rpc('increment_researcher_discussion_count', { researcher_id: profile.id });

    return NextResponse.json({
      success: true,
      discussion
    });

  } catch (error) {
    console.error('Post discussion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
