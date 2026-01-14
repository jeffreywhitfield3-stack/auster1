'use client';

// src/app/(protected)/models/create/CreateModelClient.tsx
// Simple form for creating financial models with code

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LabScope, ModelDifficulty, ModelRuntime, ModelVisibility } from '@/types/models';

interface FormData {
  name: string;
  description: string;
  lab_scope: LabScope | 'both';
  tags: string;
  difficulty: ModelDifficulty;
  runtime: ModelRuntime;
  code: string;
  input_schema: string;
  output_schema: string;
  visibility: ModelVisibility;
  is_template: boolean;
}

type CodeInputMode = 'paste' | 'upload' | 'url';

export default function CreateModelClient() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    lab_scope: 'econ',
    tags: '',
    difficulty: 'basic',
    runtime: 'python',
    code: '',
    input_schema: '{\n  "fields": []\n}',
    output_schema: '{\n  "series": [],\n  "tables": []\n}',
    visibility: 'private',
    is_template: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeInputMode, setCodeInputMode] = useState<CodeInputMode>('paste');
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setFormData((prev) => ({ ...prev, code: text }));
      setError(null);
    } catch (err) {
      setError('Failed to read file');
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      // Convert GitHub URLs to raw URLs
      let url = importUrl.trim();
      if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
        url = url
          .replace('github.com', 'raw.githubusercontent.com')
          .replace('/blob/', '/');
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch from URL');
      }

      const text = await response.text();
      setFormData((prev) => ({ ...prev, code: text }));
      setImportUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import from URL');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate JSON schemas
      let inputSchema;
      let outputSchema;

      try {
        inputSchema = JSON.parse(formData.input_schema);
      } catch {
        throw new Error('Invalid input schema JSON');
      }

      try {
        outputSchema = JSON.parse(formData.output_schema);
      } catch {
        throw new Error('Invalid output schema JSON');
      }

      // Parse tags
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const payload = {
        name: formData.name,
        description: formData.description,
        lab_scope: formData.lab_scope,
        tags,
        difficulty: formData.difficulty,
        runtime: formData.runtime,
        code: formData.code,
        input_schema: inputSchema,
        output_schema: outputSchema,
        visibility: formData.visibility,
        is_template: formData.is_template,
      };

      const response = await fetch('/api/models/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create model');
      }

      const data = await response.json();

      // Redirect to the new model
      router.push(`/models/${data.model.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create model');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Model</h1>
        <p className="text-gray-600">Upload or create a new financial model with code</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
            Basic Information
          </h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Model Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Portfolio Optimizer"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what your model does..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="lab_scope" className="block text-sm font-medium text-gray-700 mb-1">
                Lab Scope
              </label>
              <select
                id="lab_scope"
                name="lab_scope"
                value={formData.lab_scope}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="econ">Economics</option>
                <option value="derivatives">Derivatives</option>
                <option value="both">Both Labs</option>
              </select>
            </div>

            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">Basic</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label htmlFor="runtime" className="block text-sm font-medium text-gray-700 mb-1">
                Runtime
              </label>
              <select
                id="runtime"
                name="runtime"
                value={formData.runtime}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dsl">DSL</option>
                <option value="python">Python</option>
                <option value="js">JavaScript</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., portfolio, optimization, risk"
            />
          </div>
        </div>

        {/* Code */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Code</h2>

          {/* Code Input Mode Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setCodeInputMode('paste')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                codeInputMode === 'paste'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Paste Code
            </button>
            <button
              type="button"
              onClick={() => setCodeInputMode('upload')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                codeInputMode === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setCodeInputMode('url')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                codeInputMode === 'url'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Import from URL
            </button>
          </div>

          {/* Paste Code */}
          {codeInputMode === 'paste' && (
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <textarea
                id="code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                required
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Enter your model code here..."
              />
            </div>
          )}

          {/* Upload File */}
          {codeInputMode === 'upload' && (
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
                Upload Code File <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                id="file-upload"
                accept=".py,.js,.dsl,.txt"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                Supported formats: .py, .js, .dsl, .txt
              </p>
              {formData.code && (
                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-2">Preview:</p>
                  <textarea
                    value={formData.code}
                    onChange={handleInputChange}
                    name="code"
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Import from URL */}
          {codeInputMode === 'url' && (
            <div>
              <label htmlFor="import-url" className="block text-sm font-medium text-gray-700 mb-1">
                GitHub URL or Raw URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="import-url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://github.com/user/repo/blob/main/model.py"
                />
                <button
                  type="button"
                  onClick={handleImportFromUrl}
                  disabled={isImporting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isImporting ? 'Importing...' : 'Import'}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Paste a GitHub URL or direct link to a code file
              </p>
              {formData.code && (
                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-2">Imported Code:</p>
                  <textarea
                    value={formData.code}
                    onChange={handleInputChange}
                    name="code"
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Schemas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Schemas</h2>

          <div>
            <label htmlFor="input_schema" className="block text-sm font-medium text-gray-700 mb-1">
              Input Schema (JSON) <span className="text-red-500">*</span>
            </label>
            <textarea
              id="input_schema"
              name="input_schema"
              value={formData.input_schema}
              onChange={handleInputChange}
              required
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='{"fields": []}'
            />
          </div>

          <div>
            <label htmlFor="output_schema" className="block text-sm font-medium text-gray-700 mb-1">
              Output Schema (JSON) <span className="text-red-500">*</span>
            </label>
            <textarea
              id="output_schema"
              name="output_schema"
              value={formData.output_schema}
              onChange={handleInputChange}
              required
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='{"series": [], "tables": []}'
            />
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Settings</h2>

          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
              Visibility
            </label>
            <select
              id="visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="private">Private (only you)</option>
              <option value="unlisted">Unlisted (anyone with link)</option>
              <option value="public">Public (visible to all)</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_template"
              name="is_template"
              checked={formData.is_template}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_template" className="ml-2 block text-sm text-gray-700">
              Make this a template (others can fork it)
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-6 border-t">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Model'}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
