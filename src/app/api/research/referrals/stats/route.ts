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

    // Get researcher profile
    const { data: profile, error: profileError } = await supabase
      .from('researcher_profiles')
      .select('id, attribution_points')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Researcher profile not found' },
        { status: 404 }
      );
    }

    // Fetch all referrals created by this user
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', profile.id)
      .order('created_at', { ascending: false });

    if (referralsError) {
      console.error('Fetch referrals error:', referralsError);
      return NextResponse.json(
        { error: 'Failed to fetch referral statistics' },
        { status: 500 }
      );
    }

    // Calculate stats
    const totalReferrals = referrals?.length || 0;
    const totalConversions = referrals?.reduce((sum, r) => sum + (r.conversions_count || 0), 0) || 0;

    // Breakdown by source type
    const bySourceType: Record<string, { count: number; conversions: number }> = {
      research: { count: 0, conversions: 0 },
      profile: { count: 0, conversions: 0 },
      discussion: { count: 0, conversions: 0 },
      collection: { count: 0, conversions: 0 },
    };

    // Breakdown by conversion type
    const byConversionType: Record<string, number> = {
      signup: 0,
      research_publish: 0,
      follow: 0,
      discussion: 0,
    };

    referrals?.forEach((referral) => {
      const sourceType = referral.source_type;
      if (bySourceType[sourceType]) {
        bySourceType[sourceType].count++;
        bySourceType[sourceType].conversions += referral.conversions_count || 0;
      }

      // Count conversions by type
      const conversions = referral.conversions || [];
      conversions.forEach((conversion: any) => {
        if (byConversionType[conversion.type] !== undefined) {
          byConversionType[conversion.type]++;
        }
      });
    });

    // Calculate conversion rate
    const conversionRate = totalReferrals > 0
      ? ((totalConversions / totalReferrals) * 100).toFixed(1)
      : '0.0';

    // Get top performing referrals (by conversions)
    const topReferrals = referrals
      ?.filter(r => r.conversions_count > 0)
      .sort((a, b) => (b.conversions_count || 0) - (a.conversions_count || 0))
      .slice(0, 5)
      .map(r => ({
        code: r.code,
        source_type: r.source_type,
        conversions_count: r.conversions_count,
        created_at: r.created_at,
      })) || [];

    return NextResponse.json({
      stats: {
        total_referrals: totalReferrals,
        total_conversions: totalConversions,
        conversion_rate: parseFloat(conversionRate),
        attribution_points: profile.attribution_points || 0,
        by_source_type: bySourceType,
        by_conversion_type: byConversionType,
      },
      top_referrals: topReferrals,
      recent_referrals: referrals?.slice(0, 10) || [],
    });

  } catch (error) {
    console.error('Get referral stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
