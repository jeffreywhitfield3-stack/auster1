// src/lib/models/engine/validator.ts
// DSL validation before execution

import type { DslModel, DslStep, InputSchema } from '@/types/models';
import { getPrimitive, hasPrimitive } from './primitives';
import { validateOutputDefinition } from './outputs';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a complete DSL model
 */
export function validateDslModel(dsl: DslModel): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate version
  if (dsl.version !== '1.0') {
    errors.push(`Unsupported DSL version: "${dsl.version}". Expected "1.0"`);
  }

  // Validate steps exist
  if (!dsl.steps || !Array.isArray(dsl.steps) || dsl.steps.length === 0) {
    errors.push('DSL must have at least one step');
    return { valid: false, errors, warnings };
  }

  // Track step IDs to detect duplicates and validate references
  const stepIds = new Set<string>();

  // Validate each step
  for (let i = 0; i < dsl.steps.length; i++) {
    const step = dsl.steps[i];
    const stepErrors = validateStep(step, stepIds, i);
    errors.push(...stepErrors);

    if (step.id) {
      stepIds.add(step.id);
    }
  }

  // Validate outputs
  if (!dsl.outputs) {
    errors.push('DSL must define outputs');
  } else {
    const outputErrors = validateOutputDefinition(dsl.outputs);
    errors.push(...outputErrors);

    // Validate that all output sources reference valid steps
    const allSources = [
      ...(dsl.outputs.series || []).map((s) => s.source),
      ...(dsl.outputs.tables || []).map((t) => t.source),
      ...(dsl.outputs.scalars || []).map((s) => s.source),
    ];

    for (const source of allSources) {
      const stepId = source.split('.')[0];
      if (!stepIds.has(stepId)) {
        errors.push(
          `Output source "${source}" references unknown step "${stepId}"`
        );
      }
    }
  }

  // Check for circular dependencies
  const circularErrors = detectCircularDependencies(dsl.steps);
  errors.push(...circularErrors);

  // Warnings for best practices
  if (dsl.steps.length > 50) {
    warnings.push(
      'Model has more than 50 steps - consider breaking into smaller models'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single DSL step
 */
function validateStep(
  step: DslStep,
  existingStepIds: Set<string>,
  index: number
): string[] {
  const errors: string[] = [];
  const stepLabel = step.id || `step ${index}`;

  // Validate step ID
  if (!step.id || typeof step.id !== 'string' || step.id.trim() === '') {
    errors.push(`${stepLabel}: Step must have a valid id`);
  } else if (existingStepIds.has(step.id)) {
    errors.push(`${stepLabel}: Duplicate step id "${step.id}"`);
  } else if (!/^[a-z][a-z0-9_]*$/.test(step.id)) {
    errors.push(
      `${stepLabel}: Step id must start with lowercase letter and contain only lowercase letters, numbers, and underscores`
    );
  }

  // Validate operation
  if (!step.operation || typeof step.operation !== 'string') {
    errors.push(`${stepLabel}: Step must have a valid operation`);
  } else if (!hasPrimitive(step.operation)) {
    errors.push(
      `${stepLabel}: Unknown operation "${step.operation}". Use one of the available primitives.`
    );
  } else {
    // Validate operation-specific parameters
    const primitive = getPrimitive(step.operation);
    const params = step.params || {};
    const paramErrors = primitive.validate(params);

    for (const err of paramErrors) {
      errors.push(`${stepLabel}: ${err}`);
    }
  }

  // Validate params
  if (step.params !== undefined && typeof step.params !== 'object') {
    errors.push(`${stepLabel}: params must be an object`);
  }

  // Validate inputs
  if (step.inputs !== undefined) {
    if (!Array.isArray(step.inputs)) {
      errors.push(`${stepLabel}: inputs must be an array`);
    } else {
      for (const inputRef of step.inputs) {
        if (typeof inputRef !== 'string') {
          errors.push(`${stepLabel}: All input references must be strings`);
        } else if (!existingStepIds.has(inputRef)) {
          errors.push(
            `${stepLabel}: Input references unknown step "${inputRef}"`
          );
        }
      }
    }
  }

  return errors;
}

/**
 * Detect circular dependencies in DSL steps
 */
function detectCircularDependencies(steps: DslStep[]): string[] {
  const errors: string[] = [];
  const graph = buildDependencyGraph(steps);

  for (const stepId of Object.keys(graph)) {
    const visited = new Set<string>();
    const path: string[] = [];

    if (hasCircularDependency(stepId, graph, visited, path)) {
      errors.push(
        `Circular dependency detected: ${path.join(' -> ')} -> ${stepId}`
      );
    }
  }

  return errors;
}

/**
 * Build dependency graph from steps
 */
function buildDependencyGraph(
  steps: DslStep[]
): Record<string, string[]> {
  const graph: Record<string, string[]> = {};

  for (const step of steps) {
    if (step.id) {
      graph[step.id] = step.inputs || [];
    }
  }

  return graph;
}

/**
 * Check for circular dependency using DFS
 */
function hasCircularDependency(
  stepId: string,
  graph: Record<string, string[]>,
  visited: Set<string>,
  path: string[]
): boolean {
  if (path.includes(stepId)) {
    return true; // Found a cycle
  }

  if (visited.has(stepId)) {
    return false; // Already checked this path
  }

  visited.add(stepId);
  path.push(stepId);

  const dependencies = graph[stepId] || [];

  for (const dep of dependencies) {
    if (hasCircularDependency(dep, graph, visited, path)) {
      return true;
    }
  }

  path.pop();
  return false;
}

/**
 * Validate user inputs against input schema
 */
export function validateInputs(
  inputs: Record<string, any>,
  schema: InputSchema
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema.fields || !Array.isArray(schema.fields)) {
    errors.push('Invalid input schema: fields must be an array');
    return { valid: false, errors, warnings };
  }

  // Track which fields we've seen
  const providedFields = new Set(Object.keys(inputs));
  const requiredFields = new Set(
    schema.fields.filter((f) => f.required).map((f) => f.name)
  );

  // Check each schema field
  for (const field of schema.fields) {
    const value = inputs[field.name];
    const hasValue = field.name in inputs;

    // Check required fields
    if (field.required && !hasValue) {
      errors.push(`Required field "${field.name}" is missing`);
      continue;
    }

    if (!hasValue) {
      continue; // Optional field not provided
    }

    // Validate type
    const typeErrors = validateFieldType(field.name, value, field.type);
    errors.push(...typeErrors);

    // Validate constraints
    if (field.type === 'number' && typeof value === 'number') {
      if (field.min !== undefined && value < field.min) {
        errors.push(
          `Field "${field.name}" must be at least ${field.min}, got ${value}`
        );
      }

      if (field.max !== undefined && value > field.max) {
        errors.push(
          `Field "${field.name}" must be at most ${field.max}, got ${value}`
        );
      }
    }

    if (field.type === 'string' && typeof value === 'string') {
      if (field.pattern) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          errors.push(
            `Field "${field.name}" does not match required pattern: ${field.pattern}`
          );
        }
      }
    }

    if (field.type === 'select' && field.options) {
      const validOptions = field.options.map((opt) =>
        typeof opt === 'string' ? opt : opt.value
      );
      if (!validOptions.includes(value)) {
        errors.push(
          `Field "${field.name}" must be one of: ${validOptions.join(', ')}`
        );
      }
    }

    providedFields.delete(field.name);
  }

  // Warn about extra fields not in schema
  if (providedFields.size > 0) {
    for (const extraField of providedFields) {
      warnings.push(`Unknown field "${extraField}" will be ignored`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate field type
 */
function validateFieldType(
  name: string,
  value: any,
  expectedType: string
): string[] {
  const errors: string[] = [];

  switch (expectedType) {
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`Field "${name}" must be a number`);
      }
      break;

    case 'string':
      if (typeof value !== 'string') {
        errors.push(`Field "${name}" must be a string`);
      }
      break;

    case 'date':
      if (typeof value !== 'string' || isNaN(Date.parse(value))) {
        errors.push(`Field "${name}" must be a valid date string`);
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push(`Field "${name}" must be a boolean`);
      }
      break;

    case 'select':
      // Type validated in main function with options check
      break;

    default:
      errors.push(`Field "${name}" has unknown type "${expectedType}"`);
  }

  return errors;
}
