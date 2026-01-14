import { supabaseServer } from "@/lib/supabase/server";

import { NextResponse } from 'next/server';

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

    // Parse request body
    const body = await request.json();
    const { name, description, product, state, is_public } = body;

    // Validate required fields
    if (!name || !product || !state) {
      return NextResponse.json(
        { error: 'Missing required fields: name, product, state' },
        { status: 400 }
      );
    }

    // Insert workspace
    const { data: workspace, error: insertError } = await supabase
      .from('lab_workspaces')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        product,
        state,
        is_public: is_public || false,
        last_accessed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError || !workspace) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save workspace' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workspace
    });

  } catch (error) {
    console.error('Save workspace error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
