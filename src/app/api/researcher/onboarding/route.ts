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
    const { affiliation, field, institution } = body;

    if (!affiliation || !field) {
      return NextResponse.json(
        { error: 'Affiliation and field are required' },
        { status: 400 }
      );
    }

    // Check if researcher profile already exists
    const { data: existingProfile } = await supabase
      .from('researcher_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('researcher_profiles')
        .update({
          affiliation,
          field_of_study: field,
          institution,
          onboarding_completed: true,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update profile error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }
    } else {
      // Create new researcher profile
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
        displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      }

      const slug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

      const { error: insertError } = await supabase
        .from('researcher_profiles')
        .insert({
          user_id: user.id,
          display_name: displayName,
          slug,
          affiliation,
          field_of_study: field,
          institution,
          tier: 'observer',
          onboarding_completed: true,
        });

      if (insertError) {
        console.error('Create profile error:', insertError);
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
