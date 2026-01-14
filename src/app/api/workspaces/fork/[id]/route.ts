import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id: workspaceId } = await params;

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

    // Fetch the original workspace
    const { data: originalWorkspace, error: workspaceError } = await supabase
      .from('lab_workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !originalWorkspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Check if workspace is public or belongs to published research
    if (originalWorkspace.owner_id !== profile.id) {
      // Verify this workspace is attached to published research
      const { data: research } = await supabase
        .from('research_objects')
        .select('id, status')
        .eq('lab_workspace_id', workspaceId)
        .single();

      if (!research || research.status !== 'published') {
        return NextResponse.json(
          { error: 'Only workspaces from published research can be forked' },
          { status: 403 }
        );
      }
    }

    // Create forked workspace
    const forkedWorkspace = {
      owner_id: profile.id,
      lab_type: originalWorkspace.lab_type,
      name: `Fork of ${originalWorkspace.name}`,
      config: originalWorkspace.config,
      forked_from_id: workspaceId,
    };

    const { data: newWorkspace, error: forkError } = await supabase
      .from('lab_workspaces')
      .insert(forkedWorkspace)
      .select()
      .single();

    if (forkError || !newWorkspace) {
      console.error('Fork workspace error:', forkError);
      return NextResponse.json(
        { error: 'Failed to fork workspace' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workspace: newWorkspace
    }, { status: 201 });

  } catch (error) {
    console.error('Fork workspace error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
