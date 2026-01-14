// src/app/api/research/citations/create/route.ts
// Create a citation between research objects

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type CitationType = 'builds_on' | 'replicates' | 'challenges' | 'uses_method' | 'references';

/**
 * POST /api/research/citations/create
 * Create a citation from one research object to another
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
    const { citing_object_id, cited_object_id, citation_type, context } = body;

    // Validate required fields
    if (!citing_object_id || !cited_object_id || !citation_type) {
      return NextResponse.json(
        { error: 'Missing required fields: citing_object_id, cited_object_id, citation_type' },
        { status: 400 }
      );
    }

    // Validate citation type
    const validTypes: CitationType[] = ['builds_on', 'replicates', 'challenges', 'uses_method', 'references'];
    if (!validTypes.includes(citation_type)) {
      return NextResponse.json(
        { error: `Invalid citation_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify the citing research object exists and user is the author
    const { data: citingObject, error: citingError } = await supabase
      .from('research_objects')
      .select('id, author_id')
      .eq('id', citing_object_id)
      .single();

    if (citingError || !citingObject) {
      return NextResponse.json(
        { error: 'Citing research object not found' },
        { status: 404 }
      );
    }

    // Get researcher profile
    const { data: researcherProfile } = await supabase
      .from('researcher_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!researcherProfile || citingObject.author_id !== researcherProfile.id) {
      return NextResponse.json(
        { error: 'You can only add citations to your own research' },
        { status: 403 }
      );
    }

    // Verify the cited research object exists and is published
    const { data: citedObject, error: citedError } = await supabase
      .from('research_objects')
      .select('id, status')
      .eq('id', cited_object_id)
      .single();

    if (citedError || !citedObject) {
      return NextResponse.json(
        { error: 'Cited research object not found' },
        { status: 404 }
      );
    }

    if (citedObject.status !== 'published') {
      return NextResponse.json(
        { error: 'Can only cite published research' },
        { status: 400 }
      );
    }

    // Check if citation already exists
    const { data: existingCitation } = await supabase
      .from('citations')
      .select('id')
      .eq('citing_object_id', citing_object_id)
      .eq('cited_object_id', cited_object_id)
      .single();

    if (existingCitation) {
      return NextResponse.json(
        { error: 'Citation already exists' },
        { status: 409 }
      );
    }

    // Create the citation
    const { data: citation, error: insertError } = await supabase
      .from('citations')
      .insert({
        citing_object_id,
        cited_object_id,
        citation_type,
        context,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[API] Citation creation error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create citation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ citation }, { status: 201 });
  } catch (error) {
    console.error('[API] Citation creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
