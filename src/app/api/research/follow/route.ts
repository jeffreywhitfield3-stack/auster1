import { supabaseServer } from "@/lib/supabase/server";

import { NextResponse } from 'next/server';

// POST - Follow a researcher
export async function POST(request: Request) {
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

    // Get follower profile
    const { data: followerProfile } = await supabase
      .from('researcher_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!followerProfile) {
      return NextResponse.json(
        { error: 'Researcher profile not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { researcher_id } = body;

    if (!researcher_id) {
      return NextResponse.json(
        { error: 'Missing researcher_id' },
        { status: 400 }
      );
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('researcher_follows')
      .select('id')
      .eq('follower_id', followerProfile.id)
      .eq('following_id', researcher_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Already following this researcher' },
        { status: 400 }
      );
    }

    // Create follow relationship
    const { data: follow, error: insertError } = await supabase
      .from('researcher_follows')
      .insert({
        follower_id: followerProfile.id,
        following_id: researcher_id,
        notify_on_publish: true,
        notify_on_discussion: false
      })
      .select()
      .single();

    if (insertError || !follow) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to follow researcher' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      follow
    });

  } catch (error) {
    console.error('Follow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Unfollow a researcher
export async function DELETE(request: Request) {
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

    // Get follower profile
    const { data: followerProfile } = await supabase
      .from('researcher_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!followerProfile) {
      return NextResponse.json(
        { error: 'Researcher profile not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { researcher_id } = body;

    if (!researcher_id) {
      return NextResponse.json(
        { error: 'Missing researcher_id' },
        { status: 400 }
      );
    }

    // Delete follow relationship
    const { error: deleteError } = await supabase
      .from('researcher_follows')
      .delete()
      .eq('follower_id', followerProfile.id)
      .eq('following_id', researcher_id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unfollow researcher' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Unfollow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
