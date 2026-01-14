import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id: collectionId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get researcher profile
    const { data: profile, error: profileError } = await supabase
      .from('researcher_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Researcher profile not found' },
        { status: 404 }
      );
    }

    // Verify user is the curator
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id, curator_id')
      .eq('id', collectionId)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (collection.curator_id !== profile.id) {
      return NextResponse.json(
        { error: 'Forbidden - Only the curator can add research to this collection' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { research_object_id } = body;

    if (!research_object_id) {
      return NextResponse.json(
        { error: 'research_object_id is required' },
        { status: 400 }
      );
    }

    // Verify research object exists and is published
    const { data: researchObject, error: researchError } = await supabase
      .from('research_objects')
      .select('id, status')
      .eq('id', research_object_id)
      .single();

    if (researchError || !researchObject) {
      return NextResponse.json(
        { error: 'Research object not found' },
        { status: 404 }
      );
    }

    if (researchObject.status !== 'published') {
      return NextResponse.json(
        { error: 'Only published research can be added to collections' },
        { status: 400 }
      );
    }

    // Check if already in collection
    const { data: existing } = await supabase
      .from('collection_memberships')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('research_object_id', research_object_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Research object is already in this collection' },
        { status: 409 }
      );
    }

    // Get the next position (append to end)
    const { count } = await supabase
      .from('collection_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collectionId);

    const position = (count || 0) + 1;

    // Add to collection
    const { data: membership, error: insertError } = await supabase
      .from('collection_memberships')
      .insert({
        collection_id: collectionId,
        research_object_id,
        position
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert membership error:', insertError);
      return NextResponse.json(
        { error: 'Failed to add research to collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      membership
    }, { status: 201 });

  } catch (error) {
    console.error('Add to collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id: collectionId } = await params;
    const { searchParams } = new URL(request.url);
    const researchObjectId = searchParams.get('researchObjectId');

    if (!researchObjectId) {
      return NextResponse.json(
        { error: 'researchObjectId query parameter is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get researcher profile
    const { data: profile, error: profileError } = await supabase
      .from('researcher_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Researcher profile not found' },
        { status: 404 }
      );
    }

    // Verify user is the curator
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id, curator_id')
      .eq('id', collectionId)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (collection.curator_id !== profile.id) {
      return NextResponse.json(
        { error: 'Forbidden - Only the curator can remove research from this collection' },
        { status: 403 }
      );
    }

    // Delete membership
    const { error: deleteError } = await supabase
      .from('collection_memberships')
      .delete()
      .eq('collection_id', collectionId)
      .eq('research_object_id', researchObjectId);

    if (deleteError) {
      console.error('Delete membership error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove research from collection' },
        { status: 500 }
      );
    }

    // Reorder remaining items to fix position gaps
    const { data: remaining } = await supabase
      .from('collection_memberships')
      .select('id')
      .eq('collection_id', collectionId)
      .order('position', { ascending: true });

    if (remaining && remaining.length > 0) {
      for (let i = 0; i < remaining.length; i++) {
        await supabase
          .from('collection_memberships')
          .update({ position: i + 1 })
          .eq('id', remaining[i].id);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Remove from collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
