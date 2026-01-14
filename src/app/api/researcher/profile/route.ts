import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from 'next/server';

export async function GET() {
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

    // Fetch researcher profile
    const { data: profile, error: profileError } = await supabase
      .from('researcher_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      // Profile doesn't exist yet
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
