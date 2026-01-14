import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

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
    const { source_type, source_id } = body;

    if (!source_type) {
      return NextResponse.json(
        { error: 'source_type is required (research, profile, discussion, collection)' },
        { status: 400 }
      );
    }

    const validSourceTypes = ['research', 'profile', 'discussion', 'collection'];
    if (!validSourceTypes.includes(source_type)) {
      return NextResponse.json(
        { error: `Invalid source_type. Must be one of: ${validSourceTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate unique referral code
    const code = randomBytes(6).toString('hex'); // 12 character code

    // Create referral record
    const { data: referral, error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: profile.id,
        code,
        source_type,
        source_id: source_id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create referral error:', insertError);
      return NextResponse.json(
        { error: 'Failed to generate referral code' },
        { status: 500 }
      );
    }

    // Generate referral URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const referralUrl = `${baseUrl}?ref=${code}`;

    return NextResponse.json({
      success: true,
      referral: {
        ...referral,
        url: referralUrl
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Generate referral error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
