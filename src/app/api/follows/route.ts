// src/app/api/follows/route.ts
// Follow a user

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/follows
 * Follow a user
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
    const { following_id } = body;

    if (!following_id) {
      return NextResponse.json(
        { error: 'following_id is required' },
        { status: 400 }
      );
    }

    // Can't follow yourself
    if (following_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', following_id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create follow relationship (will trigger notification via database trigger)
    const { data: follow, error: followError } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id,
      })
      .select()
      .single();

    if (followError) {
      // Check if already following
      if (followError.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'Already following this user' },
          { status: 409 }
        );
      }

      console.error('[API] Follow error:', followError);
      return NextResponse.json(
        { error: 'Failed to follow user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ follow });
  } catch (error) {
    console.error('[API] Follow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
