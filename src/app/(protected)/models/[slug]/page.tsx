// src/app/(protected)/models/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Model } from '@/types/models';

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [model, setModel] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModel();
  }, [slug]);

  const fetchModel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/models/${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Model not found');
        }
        throw new Error('Failed to load model');
      }

      const data = await response.json();
      setModel(data.model);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model');
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

  if (error || !model) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 mb-4">{error || 'Model not found'}</p>
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

  const latestVersion = model.versions?.[0];

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
          <li className="text-gray-900 font-medium">{model.name}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {model.name}
            </h1>
            {/* Author info - link to their profile */}
            <p className="text-gray-600">
              by {(model as any).owner_username ? (
                <Link
                  href={`/@${(model as any).owner_username}`}
                  className="text-blue-600 hover:text-blue-700 underline font-medium"
                >
                  {(model as any).owner_display_name || (model as any).owner_username}
                </Link>
              ) : (
                <span>Unknown Author</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Lab Badge */}
            <span
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                model.lab_scope === 'econ'
                  ? 'bg-blue-100 text-blue-700'
                  : model.lab_scope === 'derivatives'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {model.lab_scope === 'econ' ? 'Econ Lab' : model.lab_scope === 'derivatives' ? 'Derivatives Lab' : 'Both Labs'}
            </span>

            {/* Difficulty Badge */}
            <span
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                model.difficulty === 'basic'
                  ? 'bg-green-100 text-green-700'
                  : model.difficulty === 'intermediate'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {model.difficulty}
            </span>
          </div>
        </div>

        <p className="text-gray-700 mb-4">{model.description}</p>

        {/* Tags */}
        {model.tags && model.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {model.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{(model.total_runs || 0).toLocaleString()} runs</span>
          </div>

          {model.avg_rating !== null && model.avg_rating !== undefined && (model.total_ratings || 0) > 0 && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              <span>
                {model.avg_rating.toFixed(1)} ({model.total_ratings} {model.total_ratings === 1 ? 'rating' : 'ratings'})
              </span>
            </div>
          )}

          {model.unique_users !== null && model.unique_users !== undefined && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{model.unique_users.toLocaleString()} unique users</span>
            </div>
          )}
        </div>
      </div>

      {/* Model Details Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Model Information</h2>

        {latestVersion && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Version</h3>
              <p className="text-gray-900">{latestVersion.version}</p>
            </div>

            {latestVersion.changelog && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Changelog</h3>
                <p className="text-gray-700">{latestVersion.changelog}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
              <p className="text-gray-700">
                {new Date(model.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h3>
              <p className="text-gray-700">
                {new Date(model.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Visibility</h3>
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded ${
                model.visibility === 'public'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {model.visibility}
              </span>
            </div>
          </div>
        )}

        {/* Coming Soon Notice */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Model Execution Coming Soon</h4>
              <p className="text-sm text-blue-800">
                The ability to run models directly on the platform is currently in development.
                For now, you can view model details, specifications, and connect with the author.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
