import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from 'next/server';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

export async function POST(request: Request) {
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

    // Parse request body
    const body = await request.json();

    const {
      name,
      description,
      collection_type,
      visibility
    } = body;

    // Validate required fields
    if (!name || !collection_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name and collection_type are required' },
        { status: 400 }
      );
    }

    // Validate collection_type
    const validTypes = ['topic', 'method', 'institution', 'series'];
    if (!validTypes.includes(collection_type)) {
      return NextResponse.json(
        { error: 'Invalid collection_type. Must be one of: topic, method, institution, series' },
        { status: 400 }
      );
    }

    // Validate visibility
    const validVisibility = ['public', 'private'];
    const finalVisibility = visibility || 'public';
    if (!validVisibility.includes(finalVisibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility. Must be either public or private' },
        { status: 400 }
      );
    }

    // Generate slug
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug for this curator
    while (true) {
      const { data: existing } = await supabase
        .from('collections')
        .select('id')
        .eq('curator_id', profile.id)
        .eq('slug', slug)
        .single();

      if (!existing) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Insert collection
    const { data: collection, error: insertError } = await supabase
      .from('collections')
      .insert({
        curator_id: profile.id,
        name,
        slug,
        description: description || null,
        collection_type,
        visibility: finalVisibility
      })
      .select()
      .single();

    if (insertError || !collection) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      collection
    });

  } catch (error) {
    console.error('Create collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
