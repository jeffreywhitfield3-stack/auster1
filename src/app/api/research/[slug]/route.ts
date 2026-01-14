import { supabaseServer } from "@/lib/supabase/server";

import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { slug } = await params;

    // Fetch research object with author info
    const { data, error } = await supabase
      .from('research_objects')
      .select(`
        *,
        author:researcher_profiles!author_id (
          id,
          display_name,
          slug,
          avatar_url,
          tier,
          credentials,
          bio
        )
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Research not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await supabase
      .from('research_objects')
      .update({
        views_count: (data.views_count || 0) + 1
      })
      .eq('id', data.id);

    return NextResponse.json({
      research_object: data
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
