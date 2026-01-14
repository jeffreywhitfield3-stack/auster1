import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from 'next/server';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await params;

    // Fetch collection with curator info and research objects
    const { data: collection, error: collectionError } = await supabase
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
      `)
      .eq('id', id)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check if user can view this collection
    if (collection.visibility === 'private') {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check if user is the curator
      const { data: profile } = await supabase
        .from('researcher_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.id !== collection.curator_id) {
        return NextResponse.json(
          { error: 'Forbidden - This collection is private' },
          { status: 403 }
        );
      }
    }

    // Fetch collection memberships with research objects, ordered by position
    const { data: memberships, error: membershipsError } = await supabase
      .from('collection_memberships')
      .select(`
        id,
        position,
        added_at,
        research_object:research_objects!research_object_id (
          id,
          title,
          slug,
          abstract,
          object_type,
          tags,
          topics,
          status,
          published_at,
          views_count,
          citations_count,
          author:researcher_profiles!author_id (
            id,
            display_name,
            slug,
            avatar_url,
            tier
          )
        )
      `)
      .eq('collection_id', id)
      .order('position', { ascending: true });

    if (membershipsError) {
      console.error('Memberships fetch error:', membershipsError);
      return NextResponse.json(
        { error: 'Failed to fetch collection members' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      collection: {
        ...collection,
        research_objects: memberships || [],
        research_count: memberships?.length || 0
      }
    });

  } catch (error) {
    console.error('Fetch collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await params;

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
      .select('id, curator_id, slug')
      .eq('id', id)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (collection.curator_id !== profile.id) {
      return NextResponse.json(
        { error: 'Forbidden - Only the curator can update this collection' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, visibility } = body;

    // Build update object
    const updates: Record<string, any> = {};

    if (name !== undefined) {
      updates.name = name;

      // Generate new slug if name changed
      const baseSlug = generateSlug(name);
      let slug = baseSlug;
      let counter = 1;

      // Ensure unique slug (excluding current collection)
      while (true) {
        const { data: existing } = await supabase
          .from('collections')
          .select('id')
          .eq('curator_id', profile.id)
          .eq('slug', slug)
          .neq('id', id)
          .single();

        if (!existing) break;

        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      updates.slug = slug;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (visibility !== undefined) {
      const validVisibility = ['public', 'private'];
      if (!validVisibility.includes(visibility)) {
        return NextResponse.json(
          { error: 'Invalid visibility. Must be either public or private' },
          { status: 400 }
        );
      }
      updates.visibility = visibility;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    // Update collection
    const { data: updatedCollection, error: updateError } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedCollection) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      collection: updatedCollection
    });

  } catch (error) {
    console.error('Update collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await params;

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

    // Verify user is the curator and delete
    const { error: deleteError } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)
      .eq('curator_id', profile.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
