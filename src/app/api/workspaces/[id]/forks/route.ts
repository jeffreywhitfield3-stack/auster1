import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id: workspaceId } = await params;

    // Fetch all forks of this workspace
    const { data: forks, error: forksError } = await supabase
      .from('lab_workspaces')
      .select(`
        id,
        name,
        lab_type,
        created_at,
        owner:researcher_profiles!owner_id (
          id,
          display_name,
          slug,
          avatar_url,
          tier
        )
      `)
      .eq('forked_from_id', workspaceId)
      .order('created_at', { ascending: false });

    if (forksError) {
      console.error('Fetch forks error:', forksError);
      return NextResponse.json(
        { error: 'Failed to fetch forks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      forks: forks || [],
      count: forks?.length || 0
    });

  } catch (error) {
    console.error('Get forks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
