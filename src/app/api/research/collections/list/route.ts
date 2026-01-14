import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);

    const collectionType = searchParams.get('type');
    const searchQuery = searchParams.get('q');
    const curatorId = searchParams.get('curatorId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('collections')
      .select(`
        *,
        curator:researcher_profiles!curator_id (
          id,
          display_name,
          slug,
          avatar_url,
          tier,
          credentials
        )
      `, { count: 'exact' });

    // Public collections only (unless user is authenticated and viewing their own)
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Get user's researcher profile
      const { data: profile } = await supabase
        .from('researcher_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile && curatorId === profile.id) {
        // User can see their own private collections
        query = query.eq('curator_id', profile.id);
      } else {
        // Only public collections
        query = query.eq('visibility', 'public');
        if (curatorId) {
          query = query.eq('curator_id', curatorId);
        }
      }
    } else {
      // Anonymous users only see public collections
      query = query.eq('visibility', 'public');
      if (curatorId) {
        query = query.eq('curator_id', curatorId);
      }
    }

    // Filter by collection type
    if (collectionType) {
      const validTypes = ['topic', 'method', 'institution', 'series'];
      if (!validTypes.includes(collectionType)) {
        return NextResponse.json(
          { error: `Invalid collection type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
      query = query.eq('collection_type', collectionType);
    }

    // Search by name or description
    if (searchQuery && searchQuery.length >= 2) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: collections, error: collectionsError, count } = await query;

    if (collectionsError) {
      console.error('Collections fetch error:', collectionsError);
      return NextResponse.json(
        { error: 'Failed to fetch collections' },
        { status: 500 }
      );
    }

    // For each collection, fetch member count
    const collectionsWithCounts = await Promise.all(
      (collections || []).map(async (collection) => {
        const { count: memberCount } = await supabase
          .from('collection_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', collection.id);

        return {
          ...collection,
          research_count: memberCount || 0
        };
      })
    );

    return NextResponse.json({
      collections: collectionsWithCounts,
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('List collections error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
