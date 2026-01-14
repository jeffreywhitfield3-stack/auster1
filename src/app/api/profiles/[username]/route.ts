// src/app/api/profiles/[username]/route.ts
// Get user profile by username

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profiles/[username]
 * Get user profile with stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { username } = await params;

    // Get current user (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if profile is public or if viewing own profile
    if (!profile.is_public && profile.id !== user?.id) {
      return NextResponse.json(
        { error: 'Profile is private' },
        { status: 403 }
      );
    }

    // Get follower/following counts
    const [followerResult, followingResult] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profile.id),
    ]);

    const follower_count = followerResult.count || 0;
    const following_count = followingResult.count || 0;

    // Check if current user follows this profile
    let is_following = false;
    if (user && user.id !== profile.id) {
      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', profile.id)
        .single();

      is_following = !!followData;
    }

    // Get user's public models count
    const { count: modelCount } = await supabase
      .from('models')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', profile.id)
      .eq('visibility', 'public');

    // Get user's public research posts count
    const { count: researchCount } = await supabase
      .from('research_posts')
      .select('*', { count: 'exact', head: true })
      .eq('researcher_id', profile.id)
      .eq('is_published', true);

    // Return profile with stats
    return NextResponse.json({
      profile: {
        ...profile,
        follower_count,
        following_count,
        is_following,
        model_count: modelCount || 0,
        research_count: researchCount || 0,
      },
    });
  } catch (error) {
    console.error('[API] Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
