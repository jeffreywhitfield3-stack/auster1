// src/lib/models/engine/executeDsl.ts
// Core DSL execution engine

import type { DslModel, ModelOutput, DslContext } from '@/types/models';
import { validateDslModel, validateInputs } from './validator';
import { getPrimitive } from './primitives';
import { formatOutputs } from './outputs';
import { DEFAULT_LIMITS } from '@/types/models';

export interface ExecutionContext {
  inputs: Record<string, any>;
  timeoutMs?: number;
  debug?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  output?: ModelOutput;
  error?: string;
  runtimeMs: number;
  stepsExecuted: number;
  warnings?: string[];
}

/**
 * Execute a DSL model with provided inputs
 */
export async function executeDsl(
  dsl: DslModel,
  context: ExecutionContext
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    // Validate DSL structure
    const validation = validateDslModel(dsl);
    if (!validation.valid) {
      return {
        success: false,
        error: `DSL validation failed: ${validation.errors.join('; ')}`,
        runtimeMs: Date.now() - startTime,
        stepsExecuted: 0,
        warnings: validation.warnings,
      };
    }

    // Set timeout
    const timeoutMs = context.timeoutMs || DEFAULT_LIMITS.DSL_MAX_RUNTIME_MS;
    const executionPromise = executeSteps(dsl, context);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Execution timeout after ${timeoutMs}ms`)),
        timeoutMs
      );
    });

    const { stepResults, stepsExecuted } = await Promise.race([
      executionPromise,
      timeoutPromise,
    ]);

    // Format outputs
    const output = formatOutputs(stepResults, dsl.outputs);

    // Add execution warnings to output
    if (validation.warnings.length > 0) {
      output.metadata = output.metadata || {
        computed_at: new Date().toISOString(),
        data_sources: [],
      };
      output.metadata.warnings = [
        ...(output.metadata.warnings || []),
        ...validation.warnings,
      ];
    }

    const runtimeMs = Date.now() - startTime;

    return {
      success: true,
      output,
      runtimeMs,
      stepsExecuted,
      warnings: validation.warnings,
    };
  } catch (error) {
    const runtimeMs = Date.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      runtimeMs,
      stepsExecuted: 0,
    };
  }
}

/**
 * Execute all DSL steps in dependency order
 */
async function executeSteps(
  dsl: DslModel,
  context: ExecutionContext
): Promise<{ stepResults: Record<string, any>; stepsExecuted: number }> {
  const stepResults: Record<string, any> = {};
  const executed = new Set<string>();
  let stepsExecuted = 0;

  // Topologically sort steps to respect dependencies
  const sortedSteps = topologicalSort(dsl.steps);

  if (context.debug) {
    console.log('[DSL Debug] Execution order:', sortedSteps.map((s) => s.id));
  }

  for (const step of sortedSteps) {
    if (!step.id) {
      throw new Error('All steps must have an id');
    }

    // Check if already executed (shouldn't happen with topological sort)
    if (executed.has(step.id)) {
      continue;
    }

    // Execute step
    const result = await executeStep(step, stepResults, context);
    stepResults[step.id] = result;
    executed.add(step.id);
    stepsExecuted++;

    if (context.debug) {
      console.log(`[DSL Debug] Step "${step.id}" completed:`, {
        operation: step.operation,
        resultType: Array.isArray(result) ? 'array' : typeof result,
        resultSize: Array.isArray(result) ? result.length : undefined,
      });
    }
  }

  return { stepResults, stepsExecuted };
}

/**
 * Execute a single DSL step
 */
async function executeStep(
  step: any,
  stepResults: Record<string, any>,
  context: ExecutionContext
): Promise<any> {
  const primitive = getPrimitive(step.operation);

  // Resolve parameters (may contain variable references like $symbol)
  const params = resolveParams(step.params || {}, context.inputs);

  // Resolve inputs (references to previous step outputs)
  const inputs = resolveInputs(step.inputs || [], stepResults);

  // Execute primitive
  try {
    const dslContext: DslContext = {
      variables: new Map(Object.entries(context.inputs)),
      cache: new Map(),
    };
    const result = await primitive.execute(params, inputs, dslContext);
    return result;
  } catch (error) {
    throw new Error(
      `Step "${step.id}" (${step.operation}) failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Resolve parameter values (replace $variables with actual input values)
 */
function resolveParams(
  params: Record<string, any>,
  inputs: Record<string, any>
): Record<string, any> {
  const resolved: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.startsWith('$')) {
      // Variable reference
      const varName = value.slice(1);

      if (!(varName in inputs)) {
        throw new Error(
          `Parameter "${key}" references undefined input variable "$${varName}"`
        );
      }

      resolved[key] = inputs[varName];
    } else if (Array.isArray(value)) {
      // Recursively resolve array elements
      resolved[key] = value.map((item) =>
        typeof item === 'string' && item.startsWith('$')
          ? inputs[item.slice(1)]
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      // Recursively resolve object properties
      resolved[key] = resolveParams(value, inputs);
    } else {
      // Literal value
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Resolve step inputs (get outputs from referenced steps)
 */
function resolveInputs(
  inputRefs: string[],
  stepResults: Record<string, any>
): any[] {
  const inputs: any[] = [];

  for (const ref of inputRefs) {
    if (!(ref in stepResults)) {
      throw new Error(`Input references unknown or unexecuted step "${ref}"`);
    }

    inputs.push(stepResults[ref]);
  }

  return inputs;
}

/**
 * Topological sort of DSL steps
 * Ensures steps are executed in dependency order
 */
function topologicalSort(steps: any[]): any[] {
  // Build dependency graph
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  const stepMap = new Map<string, any>();

  // Initialize
  for (const step of steps) {
    const id = step.id;
    stepMap.set(id, step);
    graph.set(id, new Set());
    inDegree.set(id, 0);
  }

  // Build edges
  for (const step of steps) {
    const id = step.id;
    const deps = step.inputs || [];

    for (const dep of deps) {
      if (!graph.has(dep)) {
        throw new Error(`Step "${id}" depends on unknown step "${dep}"`);
      }

      graph.get(dep)!.add(id);
      inDegree.set(id, (inDegree.get(id) || 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  const sorted: any[] = [];

  // Find all nodes with no incoming edges
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(stepMap.get(id));

    // Process outgoing edges
    const neighbors = graph.get(id)!;
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);

      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check for cycles
  if (sorted.length !== steps.length) {
    throw new Error('Circular dependency detected in DSL steps');
  }

  return sorted;
}

/**
 * Validate and sanitize user inputs
 */
export function prepareInputs(
  rawInputs: Record<string, any>,
  inputSchema: any
): Record<string, any> {
  // Validate inputs against schema
  const validation = validateInputs(rawInputs, inputSchema);

  if (!validation.valid) {
    throw new Error(`Input validation failed: ${validation.errors.join('; ')}`);
  }

  // Return sanitized inputs (could add more sanitization here)
  return { ...rawInputs };
}
