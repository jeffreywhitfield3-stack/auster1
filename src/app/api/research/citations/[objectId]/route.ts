// src/app/api/research/citations/[objectId]/route.ts
// Get citations for a research object

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/research/citations/[objectId]
 * Get all citations for a research object (both citing and cited by)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectId: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { objectId } = await params;

    // Get citations where this object cites others
    const { data: citingObjects, error: citingError } = await supabase
      .from('citations')
      .select(`
        id,
        citation_type,
        context,
        created_at,
        cited:research_objects!citations_cited_object_id_fkey(
          id,
          slug,
          title,
          object_type,
          author:researcher_profiles!research_objects_author_id_fkey(
            id,
            display_name,
            slug,
            tier
          )
        )
      `)
      .eq('citing_object_id', objectId)
      .order('created_at', { ascending: false });

    if (citingError) {
      console.error('[API] Error fetching citing objects:', citingError);
    }

    // Get citations where this object is cited by others
    const { data: citedByObjects, error: citedByError } = await supabase
      .from('citations')
      .select(`
        id,
        citation_type,
        context,
        created_at,
        citing:research_objects!citations_citing_object_id_fkey(
          id,
          slug,
          title,
          object_type,
          author:researcher_profiles!research_objects_author_id_fkey(
            id,
            display_name,
            slug,
            tier
          )
        )
      `)
      .eq('cited_object_id', objectId)
      .order('created_at', { ascending: false });

    if (citedByError) {
      console.error('[API] Error fetching cited by objects:', citedByError);
    }

    return NextResponse.json({
      citations: citingObjects || [],
      cited_by: citedByObjects || [],
    });
  } catch (error) {
    console.error('[API] Citations fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/research/citations/[objectId]
 * Delete a specific citation (requires citation ID in query params)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ objectId: string }> }
) {
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

    const { searchParams } = new URL(request.url);
    const citationId = searchParams.get('citationId');

    if (!citationId) {
      return NextResponse.json(
        { error: 'Missing citationId query parameter' },
        { status: 400 }
      );
    }

    // Get researcher profile
    const { data: researcherProfile } = await supabase
      .from('researcher_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!researcherProfile) {
      return NextResponse.json(
        { error: 'Researcher profile not found' },
        { status: 404 }
      );
    }

    // Verify the citation exists and belongs to the user's research
    const { data: citation, error: fetchError } = await supabase
      .from('citations')
      .select(`
        id,
        citing:research_objects!citations_citing_object_id_fkey(author_id)
      `)
      .eq('id', citationId)
      .single();

    if (fetchError || !citation) {
      return NextResponse.json(
        { error: 'Citation not found' },
        { status: 404 }
      );
    }

    if ((citation.citing as any).author_id !== researcherProfile.id) {
      return NextResponse.json(
        { error: 'You can only delete citations from your own research' },
        { status: 403 }
      );
    }

    // Delete the citation
    const { error: deleteError } = await supabase
      .from('citations')
      .delete()
      .eq('id', citationId);

    if (deleteError) {
      console.error('[API] Citation deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete citation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Citation deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
