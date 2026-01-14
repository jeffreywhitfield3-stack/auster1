// src/app/api/artifacts/[slug]/route.ts
// Get published artifact by slug

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/artifacts/[slug]
 * Get artifact details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { slug } = await params;

    // Fetch artifact (public only)
    const { data: artifact, error } = await supabase
      .from('published_artifacts')
      .select(`
        *,
        user:users!published_artifacts_user_id_fkey(email, display_name),
        model:models!published_artifacts_model_id_fkey(id, slug, name)
      `)
      .eq('slug', slug)
      .eq('visibility', 'public')
      .single();

    if (error) {
      console.error('[API] Artifact fetch error:', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Artifact not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch artifact' },
        { status: 500 }
      );
    }

    return NextResponse.json({ artifact });
  } catch (error) {
    console.error('[API] Artifact fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
