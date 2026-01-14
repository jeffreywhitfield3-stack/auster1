import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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

    // Get researcher profile (the referee - person who was referred)
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
    const { referral_code, conversion_type } = body;

    if (!referral_code) {
      return NextResponse.json(
        { error: 'referral_code is required' },
        { status: 400 }
      );
    }

    if (!conversion_type) {
      return NextResponse.json(
        { error: 'conversion_type is required (signup, research_publish, follow, discussion)' },
        { status: 400 }
      );
    }

    // Find the referral record
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('id, referrer_id')
      .eq('code', referral_code)
      .single();

    if (referralError || !referral) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      );
    }

    // Check if this is a self-referral (not allowed)
    if (referral.referrer_id === profile.id) {
      return NextResponse.json(
        { error: 'Cannot use your own referral code' },
        { status: 400 }
      );
    }

    // Check if this conversion already exists
    const { data: existing } = await supabase
      .from('referrals')
      .select('conversions')
      .eq('id', referral.id)
      .single();

    const conversions = existing?.conversions || [];
    const alreadyConverted = conversions.some(
      (c: any) => c.referee_id === profile.id && c.type === conversion_type
    );

    if (alreadyConverted) {
      return NextResponse.json(
        { error: 'Conversion already tracked for this user and type' },
        { status: 409 }
      );
    }

    // Add conversion
    const newConversion = {
      referee_id: profile.id,
      type: conversion_type,
      converted_at: new Date().toISOString(),
    };

    const updatedConversions = [...conversions, newConversion];

    // Update referral with new conversion
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        conversions: updatedConversions,
        conversions_count: updatedConversions.length,
      })
      .eq('id', referral.id);

    if (updateError) {
      console.error('Update referral error:', updateError);
      return NextResponse.json(
        { error: 'Failed to track conversion' },
        { status: 500 }
      );
    }

    // Award attribution points based on conversion type
    const pointsMap: Record<string, number> = {
      signup: 10,
      research_publish: 25,
      follow: 5,
      discussion: 5,
    };

    const pointsAwarded = pointsMap[conversion_type] || 5;

    // Update referrer's attribution points
    const { error: pointsError } = await supabase.rpc('increment_attribution_points', {
      profile_id: referral.referrer_id,
      points: pointsAwarded,
    });

    if (pointsError) {
      console.error('Attribution points error:', pointsError);
      // Don't fail the request if points update fails
    }

    return NextResponse.json({
      success: true,
      points_awarded: pointsAwarded,
    });

  } catch (error) {
    console.error('Track referral error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
