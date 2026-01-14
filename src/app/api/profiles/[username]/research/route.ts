// src/app/api/profiles/[username]/research/route.ts
// Get user's published research posts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profiles/[username]/research
 * Get user's published research posts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { username } = await params;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const offset = (page - 1) * limit;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get user's published research
    const { data: research, error: researchError, count } = await supabase
      .from('research_posts')
      .select('*', { count: 'exact' })
      .eq('researcher_id', profile.id)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (researchError) {
      console.error('[API] Fetch user research error:', researchError);
      return NextResponse.json(
        { error: 'Failed to fetch research' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      research: research || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('[API] User research fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
