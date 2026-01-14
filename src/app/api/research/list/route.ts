import { supabaseServer } from "@/lib/supabase/server";

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const object_type = searchParams.get('type');
    const topic = searchParams.get('topic');
    const author_slug = searchParams.get('author');

    // Build query
    let query = supabase
      .from('research_objects')
      .select(`
        *,
        author:researcher_profiles!author_id (
          id,
          display_name,
          slug,
          avatar_url,
          tier,
          credentials
        )
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (object_type) {
      query = query.eq('object_type', object_type);
    }

    if (topic) {
      query = query.contains('topics', [topic]);
    }

    if (author_slug) {
      // Get author ID from slug
      const { data: authorData } = await supabase
        .from('researcher_profiles')
        .select('id')
        .eq('slug', author_slug)
        .single();

      if (authorData) {
        query = query.eq('author_id', authorData.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch research' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      research_objects: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('List error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
