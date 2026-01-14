import { supabaseServer } from "@/lib/supabase/server";

import { NextResponse } from 'next/server';

function generateSlug(title: string): string {
  return title
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

    // Get or create researcher profile
    let { data: profile, error: profileError } = await supabase
      .from('researcher_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      // Create profile if doesn't exist
      // Use first_name and last_name from user_metadata if available
      const firstName = user.user_metadata?.first_name || '';
      const lastName = user.user_metadata?.last_name || '';

      let displayName: string;
      if (firstName && lastName) {
        displayName = `${firstName} ${lastName}`;
      } else if (firstName) {
        displayName = firstName;
      } else if (lastName) {
        displayName = lastName;
      } else {
        // Fallback to full_name or email
        displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Researcher';
      }

      const baseSlug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const { data: newProfile, error: createError } = await supabase
        .from('researcher_profiles')
        .insert({
          user_id: user.id,
          display_name: displayName,
          slug: baseSlug + '-' + Math.random().toString(36).substring(7),
          tier: 'observer'
        })
        .select('id')
        .single();

      if (createError || !newProfile) {
        return NextResponse.json(
          { error: 'Failed to create researcher profile' },
          { status: 500 }
        );
      }

      profile = newProfile;
    }

    // Parse request body
    const body = await request.json();

    const {
      title,
      abstract,
      content,
      object_type,
      methods,
      assumptions,
      data_sources,
      statistical_techniques,
      lab_type,
      lab_workspace_id,
      lab_state,
      linked_model_slug,
      tags,
      topics
    } = body;

    // Validate required fields
    if (!title || !abstract || !object_type || !methods || !assumptions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate slug
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (true) {
      const { data: existing } = await supabase
        .from('research_objects')
        .select('id')
        .eq('author_id', profile.id)
        .eq('slug', slug)
        .single();

      if (!existing) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Resolve model ID if linked_model_slug is provided
    let linkedModelId = null;
    if (linked_model_slug) {
      const { data: model } = await supabase
        .from('models')
        .select('id')
        .eq('slug', linked_model_slug)
        .single();

      if (model) {
        linkedModelId = model.id;
      }
    }

    // Insert research object
    const { data: researchObject, error: insertError } = await supabase
      .from('research_objects')
      .insert({
        author_id: profile.id,
        title,
        slug,
        abstract,
        object_type,
        content: typeof content === 'string' ? { text: content } : content,
        methods,
        assumptions,
        data_sources: data_sources || [],
        statistical_techniques: statistical_techniques || [],
        lab_type: lab_type || 'none',
        lab_workspace_id: lab_workspace_id || null,
        lab_state: lab_state || null,
        linked_model_id: linkedModelId,
        tags: tags || [],
        topics: topics || [],
        status: 'published',
        published_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError || !researchObject) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to publish research' },
        { status: 500 }
      );
    }

    // Update researcher counts
    await supabase.rpc('increment_published_count', { researcher_id: profile.id });

    // Log activity
    await supabase
      .from('researcher_activity')
      .insert({
        researcher_id: profile.id,
        activity_type: 'published_object',
        related_object_id: researchObject.id,
        attribution_points: 1.0,
        credibility_points: 1.0
      });

    return NextResponse.json({
      success: true,
      research_object: researchObject
    });

  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
