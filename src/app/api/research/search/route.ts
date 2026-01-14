// src/app/api/research/search/route.ts
// Search published research objects

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/research/search
 * Search published research objects by title, abstract, or author
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const excludeId = searchParams.get('excludeId'); // Exclude a specific ID (e.g., current research)

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        total: 0,
      });
    }

    // Build search query
    let searchQuery = supabase
      .from('research_objects')
      .select(`
        id,
        slug,
        title,
        abstract,
        object_type,
        topics,
        published_at,
        views_count,
        discussions_count,
        citations_count,
        author:researcher_profiles!research_objects_author_id_fkey(
          id,
          display_name,
          slug,
          tier,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,abstract.ilike.%${query}%`)
      .order('published_at', { ascending: false })
      .limit(limit);

    // Exclude specific ID if provided
    if (excludeId) {
      searchQuery = searchQuery.neq('id', excludeId);
    }

    const { data: results, error, count } = await searchQuery;

    if (error) {
      console.error('[API] Search error:', error);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      results: results || [],
      total: count || 0,
    });
  } catch (error) {
    console.error('[API] Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
