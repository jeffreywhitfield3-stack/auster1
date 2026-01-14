// src/components/models/RunPanel.tsx
'use client';

import { useState } from 'react';
import type { InputSchema, ModelOutput } from '@/types/models';

interface RunPanelProps {
  modelSlug: string;
  inputSchema: InputSchema;
  onRunComplete: (output: ModelOutput, runId: string) => void;
}

export default function RunPanel({ modelSlug, inputSchema, onRunComplete }: RunPanelProps) {
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (fieldName: string, value: any) => {
    setInputs((prev) => ({ ...prev, [fieldName]: value }));
    setError(null);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch('/api/models/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_slug: modelSlug,
          inputs,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run model');
      }

      onRunComplete(data.output, data.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run model');
    } finally {
      setIsRunning(false);
    }
  };

  // Safety check for input schema
  if (!inputSchema || !inputSchema.fields || !Array.isArray(inputSchema.fields)) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Run Model</h2>
        <p className="text-gray-600">This model doesn't have a valid input schema configured.</p>
      </div>
    );
  }

  const isFormValid = inputSchema.fields.every((field) => {
    if (!field.required) return true;
    const value = inputs[field.name];
    return value !== undefined && value !== null && value !== '';
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Run Model</h2>

      {/* Input Fields */}
      <div className="space-y-4 mb-6">
        {inputSchema.fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {field.description && (
              <p className="text-xs text-gray-500 mb-2">{field.description}</p>
            )}

            {/* Render input based on type */}
            {field.type === 'number' && (
              <input
                type="number"
                value={inputs[field.name] ?? field.default ?? ''}
                onChange={(e) =>
                  handleInputChange(field.name, parseFloat(e.target.value))
                }
                min={field.min}
                max={field.max}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={field.placeholder}
              />
            )}

            {field.type === 'string' && (
              <input
                type="text"
                value={inputs[field.name] ?? field.default ?? ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                pattern={field.pattern}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={field.placeholder}
              />
            )}

            {field.type === 'date' && (
              <input
                type="date"
                value={inputs[field.name] ?? field.default ?? ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {field.type === 'boolean' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs[field.name] ?? field.default ?? false}
                  onChange={(e) =>
                    handleInputChange(field.name, e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {field.placeholder || 'Enable'}
                </span>
              </label>
            )}

            {field.type === 'select' && field.options && (
              <select
                value={inputs[field.name] ?? field.default ?? ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                {field.options.map((opt) => {
                  const value = typeof opt === 'string' ? opt : opt.value;
                  const label = typeof opt === 'string' ? opt : opt.label;
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Run Button */}
      <button
        onClick={handleRun}
        disabled={!isFormValid || isRunning}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isRunning ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Running...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Run Model
          </>
        )}
      </button>
    </div>
  );
}
