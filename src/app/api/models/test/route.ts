// Test endpoint to diagnose models API issues
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await supabaseServer();

    console.log('[TEST] Starting models test...');

    // Test 1: Simple count
    const { count: totalCount, error: countError } = await supabase
      .from('models')
      .select('*', { count: 'exact', head: true });

    console.log('[TEST] Total models count:', totalCount, 'Error:', countError);

    // Test 2: Simple select
    const { data: simpleModels, error: simpleError } = await supabase
      .from('models')
      .select('id, slug, name, visibility, owner_id')
      .limit(5);

    console.log('[TEST] Simple select:', simpleModels?.length || 0, 'models', 'Error:', simpleError);

    // Test 3: With owner join
    const { data: withOwner, error: ownerError } = await supabase
      .from('models')
      .select(`
        id,
        slug,
        name,
        visibility,
        owner_id,
        owner:users!models_owner_id_fkey(email, display_name)
      `)
      .limit(5);

    console.log('[TEST] With owner join:', withOwner?.length || 0, 'models', 'Error:', ownerError);

    // Test 4: Check if user exists for models
    if (simpleModels && simpleModels.length > 0) {
      const ownerId = simpleModels[0].owner_id;
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, display_name')
        .eq('id', ownerId)
        .single();

      console.log('[TEST] User data for owner_id', ownerId, ':', userData, 'Error:', userError);
    }

    return NextResponse.json({
      totalCount,
      countError,
      simpleModels,
      simpleError,
      withOwner,
      ownerError,
    });
  } catch (error: any) {
    console.error('[TEST] Error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
