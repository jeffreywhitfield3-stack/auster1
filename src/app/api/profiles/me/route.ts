// src/app/api/profiles/me/route.ts
// Get and update current user's profile

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profiles/me
 * Get current user's profile
 */
export async function GET() {
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

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
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

    return NextResponse.json({
      profile: {
        ...profile,
        follower_count: followerResult.count || 0,
        following_count: followingResult.count || 0,
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

/**
 * PATCH /api/profiles/me
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
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

    // Validate and build updates
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    // Allowed fields to update
    if (body.display_name !== undefined) {
      updates.display_name = body.display_name.trim();
      if (!updates.display_name) {
        return NextResponse.json(
          { error: 'Display name cannot be empty' },
          { status: 400 }
        );
      }
    }

    if (body.bio !== undefined) {
      updates.bio = body.bio?.trim() || null;
      if (updates.bio && updates.bio.length > 500) {
        return NextResponse.json(
          { error: 'Bio must be 500 characters or less' },
          { status: 400 }
        );
      }
    }

    if (body.affiliation !== undefined) {
      updates.affiliation = body.affiliation?.trim() || null;
      if (updates.affiliation && updates.affiliation.length > 200) {
        return NextResponse.json(
          { error: 'Affiliation must be 200 characters or less' },
          { status: 400 }
        );
      }
    }

    if (body.avatar_url !== undefined) {
      updates.avatar_url = body.avatar_url || null;
    }

    if (body.website_url !== undefined) {
      updates.website_url = body.website_url?.trim() || null;
    }

    if (body.twitter_handle !== undefined) {
      updates.twitter_handle = body.twitter_handle?.trim() || null;
    }

    if (body.linkedin_url !== undefined) {
      updates.linkedin_url = body.linkedin_url?.trim() || null;
    }

    if (body.github_handle !== undefined) {
      updates.github_handle = body.github_handle?.trim() || null;
    }

    if (body.location !== undefined) {
      updates.location = body.location?.trim() || null;
    }

    if (body.is_public !== undefined) {
      updates.is_public = Boolean(body.is_public);
    }

    if (body.show_activity !== undefined) {
      updates.show_activity = Boolean(body.show_activity);
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('[API] Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
