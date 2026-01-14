import { supabaseServer } from "@/lib/supabase/server";

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    const workspace_id = searchParams.get('id');

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'Missing workspace ID' },
        { status: 400 }
      );
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Fetch workspace
    const { data: workspace, error } = await supabase
      .from('lab_workspaces')
      .select('*')
      .eq('id', workspace_id)
      .single();

    if (error || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Check access permissions (must be owner or public)
    if (!workspace.is_public && (!user || workspace.user_id !== user.id)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update last accessed time if user is owner
    if (user && workspace.user_id === user.id) {
      await supabase
        .from('lab_workspaces')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', workspace_id);
    }

    return NextResponse.json({
      workspace
    });

  } catch (error) {
    console.error('Load workspace error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
