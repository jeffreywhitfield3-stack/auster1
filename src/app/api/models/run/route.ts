// src/app/api/models/run/route.ts
// Execute a model with inputs

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { executeDsl, prepareInputs } from '@/lib/models/engine/executeDsl';
import { getCached, setCached, modelRunKey, CACHE_TTL } from '@/lib/models/data/cache';
import type { ModelOutput } from '@/types/models';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max

/**
 * POST /api/models/run
 * Execute a model with provided inputs
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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

    const body = await request.json();
    const { model_slug, inputs } = body;

    if (!model_slug || !inputs) {
      return NextResponse.json(
        { error: 'Missing required fields: model_slug, inputs' },
        { status: 400 }
      );
    }

    // Fetch model with latest version
    const { data: models, error: modelError } = await supabase
      .from('models')
      .select(`
        *,
        versions:model_versions!model_versions_model_id_fkey(*)
      `)
      .eq('slug', model_slug)
      .or(`visibility.eq.public,owner_id.eq.${user.id}`)
      .single();

    if (modelError || !models) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    const model = models;

    // Get latest version
    const versions = model.versions || [];
    versions.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (versions.length === 0) {
      return NextResponse.json(
        { error: 'No versions available for this model' },
        { status: 400 }
      );
    }

    const version = versions[0];

    // Check rate limits
    const rateLimitError = await checkRateLimits(supabase, user.id, model.id);
    if (rateLimitError) {
      return NextResponse.json(
        { error: rateLimitError },
        { status: 429 }
      );
    }

    // Check cache for identical run
    const cacheKey = modelRunKey(version.id, inputs);
    const cachedOutput = await getCached<ModelOutput>(cacheKey);

    if (cachedOutput) {
      return NextResponse.json({
        output: cachedOutput,
        cached: true,
        runtimeMs: Date.now() - startTime,
      });
    }

    // Validate and prepare inputs
    let preparedInputs;
    try {
      preparedInputs = prepareInputs(inputs, version.input_schema);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Input validation failed',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 400 }
      );
    }

    // Execute DSL
    if (version.runtime !== 'dsl') {
      return NextResponse.json(
        { error: 'Only DSL runtime supported in Phase 1' },
        { status: 400 }
      );
    }

    const result = await executeDsl(version.dsl_json, {
      inputs: preparedInputs,
      debug: false,
    });

    if (!result.success) {
      // Log failed run
      await supabase.from('model_runs').insert({
        user_id: user.id,
        model_version_id: version.id,
        inputs_json: preparedInputs,
        outputs_json: null,
        runtime_ms: result.runtimeMs,
        status: 'failed',
        error_message: result.error,
      });

      return NextResponse.json(
        {
          error: 'Execution failed',
          details: result.error,
          runtimeMs: result.runtimeMs,
        },
        { status: 500 }
      );
    }

    // Log successful run
    const { data: run, error: runError } = await supabase
      .from('model_runs')
      .insert({
        user_id: user.id,
        model_version_id: version.id,
        inputs_json: preparedInputs,
        outputs_json: result.output,
        runtime_ms: result.runtimeMs,
        status: 'success',
      })
      .select()
      .single();

    if (runError) {
      console.error('[API] Failed to log run:', runError);
      // Continue anyway - execution succeeded
    }

    // Cache result
    await setCached(cacheKey, result.output!, CACHE_TTL.MODEL_RUN);

    return NextResponse.json({
      output: result.output,
      runId: run?.id,
      cached: false,
      runtimeMs: result.runtimeMs,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error('[API] Model run error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Check rate limits for user
 */
async function checkRateLimits(
  supabase: any,
  userId: string,
  modelId: string
): Promise<string | null> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  // Check runs per day
  const { count: dailyCount, error: dailyError } = await supabase
    .from('model_runs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneDayAgo.toISOString());

  if (dailyError) {
    console.error('[API] Rate limit check error:', dailyError);
    return null; // Allow on error
  }

  // TODO: Check user tier from database
  const maxPerDay = 100; // Default to paid tier limit

  if ((dailyCount || 0) >= maxPerDay) {
    return `Daily limit reached (${maxPerDay} runs per day)`;
  }

  // Check runs per minute
  const { count: minuteCount, error: minuteError } = await supabase
    .from('model_runs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneMinuteAgo.toISOString());

  if (minuteError) {
    console.error('[API] Rate limit check error:', minuteError);
    return null; // Allow on error
  }

  const maxPerMinute = 3;

  if ((minuteCount || 0) >= maxPerMinute) {
    return 'Rate limit exceeded (max 3 runs per minute)';
  }

  return null; // No limit exceeded
}
