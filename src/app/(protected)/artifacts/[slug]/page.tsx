// src/app/(protected)/artifacts/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ResultsPanel from '@/components/models/ResultsPanel';
import type { ModelOutput } from '@/types/models';

interface Artifact {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  inputs_json: Record<string, any>;
  outputs_json: ModelOutput;
  created_at: string;
  user: {
    email: string;
    display_name?: string;
  };
  model: {
    id: string;
    slug: string;
    name: string;
  };
}

export default function ArtifactPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArtifact();
  }, [slug]);

  const fetchArtifact = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/artifacts/${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Artifact not found');
        }
        throw new Error('Failed to load artifact');
      }

      const data = await response.json();
      setArtifact(data.artifact);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artifact');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
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
        </div>
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 mb-4">{error || 'Artifact not found'}</p>
          <button
            onClick={() => router.push('/models')}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            Back to models
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-gray-500">
          <li>
            <button
              onClick={() => router.push('/models')}
              className="hover:text-gray-700"
            >
              Models
            </button>
          </li>
          <li>/</li>
          <li>
            <button
              onClick={() => router.push(`/models/${artifact.model.slug}`)}
              className="hover:text-gray-700"
            >
              {artifact.model.name}
            </button>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium">{artifact.title}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {artifact.title}
            </h1>
            <p className="text-sm text-gray-600">
              Published by {artifact.user.display_name || artifact.user.email} on{' '}
              {new Date(artifact.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <button
            onClick={() => router.push(`/models/${artifact.model.slug}`)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Run this model
          </button>
        </div>

        {artifact.description && (
          <p className="text-gray-700 mb-4">{artifact.description}</p>
        )}

        {/* Model Badge */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Model:</span>
          <button
            onClick={() => router.push(`/models/${artifact.model.slug}`)}
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            {artifact.model.name}
          </button>
        </div>

        {/* Inputs Used */}
        {Object.keys(artifact.inputs_json).length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">Inputs used:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(artifact.inputs_json).map(([key, value]) => (
                <span
                  key={key}
                  className="px-2 py-1 text-xs bg-white border border-gray-200 rounded"
                >
                  <span className="font-medium">{key}:</span>{' '}
                  <span className="text-gray-600">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <ResultsPanel output={artifact.outputs_json} />
    </div>
  );
}
