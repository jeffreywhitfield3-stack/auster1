// src/lib/models/engine/outputs.ts
// Output formatting for DSL execution results

import type {
  ModelOutput,
  OutputSeries,
  OutputTable,
  DslOutputDefinition,
} from '@/types/models';

/**
 * Format execution results according to the output definition
 */
export function formatOutputs(
  stepResults: Record<string, any>,
  outputDef: DslOutputDefinition
): ModelOutput {
  const output: ModelOutput = {
    metadata: {
      computed_at: new Date().toISOString(),
      data_sources: [],
      warnings: [],
    },
  };

  // Format series outputs
  if (outputDef.series && outputDef.series.length > 0) {
    output.series = outputDef.series.map((seriesDef) => {
      const data = resolveSource(stepResults, seriesDef.source);

      // Validate data is an array of numbers
      if (!Array.isArray(data)) {
        output.metadata?.warnings?.push(
          `Series "${seriesDef.id}" source "${seriesDef.source}" did not return an array`
        );
        return {
          id: seriesDef.id,
          label: seriesDef.label,
          data: [],
          color: seriesDef.color,
          type: seriesDef.type || 'line',
        };
      }

      // Convert number array to SeriesDataPoint array
      const seriesData = Array.isArray(data) && typeof data[0] === 'number'
        ? data.map((value: number, index: number) => ({ x: index, y: value }))
        : data;

      return {
        id: seriesDef.id,
        label: seriesDef.label,
        data: seriesData,
        color: seriesDef.color,
        type: seriesDef.type || 'line',
      };
    });
  }

  // Format table outputs
  if (outputDef.tables && outputDef.tables.length > 0) {
    output.tables = outputDef.tables.map((tableDef) => {
      const data = resolveSource(stepResults, tableDef.source);

      // Validate data structure
      if (!Array.isArray(data)) {
        output.metadata?.warnings?.push(
          `Table "${tableDef.id}" source "${tableDef.source}" did not return an array`
        );
        return {
          id: tableDef.id,
          label: tableDef.label,
          columns: [],
          rows: [],
        };
      }

      // Convert string columns to OutputColumn objects
      const columns = tableDef.columns && tableDef.columns.length > 0
        ? tableDef.columns.map((col: string) => ({
            key: col,
            label: col.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            type: 'string' as const,
          }))
        : inferColumns(data);

      return {
        id: tableDef.id,
        label: tableDef.label,
        columns,
        rows: data,
      };
    });
  }

  // Format scalar outputs
  if (outputDef.scalars && outputDef.scalars.length > 0) {
    const scalars: Record<string, number | string> = {};

    for (const scalarDef of outputDef.scalars) {
      const value = resolveSource(stepResults, scalarDef.source);

      // Convert to appropriate type
      if (typeof value === 'number' || typeof value === 'string') {
        scalars[scalarDef.id] = value;
      } else if (Array.isArray(value) && value.length === 1) {
        scalars[scalarDef.id] = value[0];
      } else {
        output.metadata?.warnings?.push(
          `Scalar "${scalarDef.id}" source "${scalarDef.source}" did not return a scalar value`
        );
        scalars[scalarDef.id] = NaN;
      }
    }

    output.scalars = scalars;
  }

  return output;
}

/**
 * Resolve a source reference to actual data from step results
 * Source format: "step_id" or "step_id.field"
 */
function resolveSource(stepResults: Record<string, any>, source: string): any {
  const parts = source.split('.');
  const stepId = parts[0];

  if (!(stepId in stepResults)) {
    throw new Error(`Source step "${stepId}" not found in results`);
  }

  let value = stepResults[stepId];

  // Navigate nested fields if specified
  for (let i = 1; i < parts.length; i++) {
    const field = parts[i];
    if (value && typeof value === 'object' && field in value) {
      value = value[field];
    } else {
      throw new Error(
        `Field "${field}" not found in source "${parts.slice(0, i).join('.')}"`
      );
    }
  }

  return value;
}

/**
 * Infer column definitions from data
 */
function inferColumns(data: any[]): Array<{ key: string; label: string; type: 'string' | 'number' | 'date' | 'boolean' }> {
  if (data.length === 0) {
    return [];
  }

  const firstRow = data[0];

  if (typeof firstRow !== 'object' || firstRow === null) {
    // Array of primitives - single column
    return [{ key: 'value', label: 'Value', type: 'string' }];
  }

  // Array of objects - extract keys and infer types
  return Object.keys(firstRow).map((key) => {
    const value = firstRow[key];
    let type: 'string' | 'number' | 'date' | 'boolean' = 'string';

    if (typeof value === 'number') type = 'number';
    else if (typeof value === 'boolean') type = 'boolean';
    else if (value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(value))) type = 'date';

    return {
      key,
      label: key
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      type,
    };
  });
}

/**
 * Validate output definition
 */
export function validateOutputDefinition(
  outputDef: DslOutputDefinition
): string[] {
  const errors: string[] = [];

  // Check that at least one output type is defined
  const hasOutputs =
    (outputDef.series && outputDef.series.length > 0) ||
    (outputDef.tables && outputDef.tables.length > 0) ||
    (outputDef.scalars && outputDef.scalars.length > 0);

  if (!hasOutputs) {
    errors.push('At least one output (series, table, or scalar) must be defined');
  }

  // Validate series
  if (outputDef.series) {
    const seriesIds = new Set<string>();

    for (const series of outputDef.series) {
      if (!series.id || typeof series.id !== 'string') {
        errors.push('Each series must have a valid id');
      } else if (seriesIds.has(series.id)) {
        errors.push(`Duplicate series id: "${series.id}"`);
      } else {
        seriesIds.add(series.id);
      }

      if (!series.source || typeof series.source !== 'string') {
        errors.push(`Series "${series.id}" must have a valid source`);
      }

      if (!series.label || typeof series.label !== 'string') {
        errors.push(`Series "${series.id}" must have a valid label`);
      }

      if (series.type && !['line', 'bar', 'area'].includes(series.type)) {
        errors.push(
          `Series "${series.id}" type must be one of: line, bar, area`
        );
      }
    }
  }

  // Validate tables
  if (outputDef.tables) {
    const tableIds = new Set<string>();

    for (const table of outputDef.tables) {
      if (!table.id || typeof table.id !== 'string') {
        errors.push('Each table must have a valid id');
      } else if (tableIds.has(table.id)) {
        errors.push(`Duplicate table id: "${table.id}"`);
      } else {
        tableIds.add(table.id);
      }

      if (!table.source || typeof table.source !== 'string') {
        errors.push(`Table "${table.id}" must have a valid source`);
      }

      if (!table.label || typeof table.label !== 'string') {
        errors.push(`Table "${table.id}" must have a valid label`);
      }

      if (table.columns) {
        if (!Array.isArray(table.columns)) {
          errors.push(`Table "${table.id}" columns must be an array`);
        } else {
          for (const col of table.columns) {
            if (typeof col !== 'string') {
              errors.push(`Table "${table.id}" has invalid column (must be string)`);
            }
          }
        }
      }
    }
  }

  // Validate scalars
  if (outputDef.scalars) {
    const scalarIds = new Set<string>();

    for (const scalar of outputDef.scalars) {
      if (!scalar.id || typeof scalar.id !== 'string') {
        errors.push('Each scalar must have a valid id');
      } else if (scalarIds.has(scalar.id)) {
        errors.push(`Duplicate scalar id: "${scalar.id}"`);
      } else {
        scalarIds.add(scalar.id);
      }

      if (!scalar.source || typeof scalar.source !== 'string') {
        errors.push(`Scalar "${scalar.id}" must have a valid source`);
      }

      if (!scalar.label || typeof scalar.label !== 'string') {
        errors.push(`Scalar "${scalar.id}" must have a valid label`);
      }
    }
  }

  return errors;
}

/**
 * Extract data sources from output definition
 * Useful for determining what data needs to be fetched
 */
export function extractDataSources(outputDef: DslOutputDefinition): string[] {
  const sources = new Set<string>();

  const addSource = (source: string) => {
    const stepId = source.split('.')[0];
    sources.add(stepId);
  };

  if (outputDef.series) {
    outputDef.series.forEach((s) => addSource(s.source));
  }

  if (outputDef.tables) {
    outputDef.tables.forEach((t) => addSource(t.source));
  }

  if (outputDef.scalars) {
    outputDef.scalars.forEach((s) => addSource(s.source));
  }

  return Array.from(sources);
}
