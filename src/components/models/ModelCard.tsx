// src/components/models/ModelCard.tsx
'use client';

import Link from 'next/link';
import type { Model } from '@/types/models';

interface ModelCardProps {
  model: Model;
}

export default function ModelCard({ model }: ModelCardProps) {
  return (
    <Link
      href={`/models/${model.slug}`}
      className="block bg-white border border-zinc-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-zinc-900 mb-1">
            {model.name}
          </h3>
          <p className="text-sm text-zinc-500">
            by {model.owner?.display_name || model.owner?.email || 'Unknown'}
          </p>
        </div>

        {/* Lab Badge */}
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            model.lab_scope === 'econ'
              ? 'bg-blue-100 text-blue-700'
              : model.lab_scope === 'derivatives'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-zinc-100 text-zinc-700'
          }`}
        >
          {model.lab_scope === 'econ' ? 'Econ' : model.lab_scope === 'derivatives' ? 'Derivatives' : 'Both'}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-600 mb-4 line-clamp-2">
        {model.description}
      </p>

      {/* Tags */}
      {model.tags && model.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {model.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-zinc-100 text-zinc-600 rounded"
            >
              {tag}
            </span>
          ))}
          {model.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-zinc-500">
              +{model.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-zinc-500">
        {/* Runs */}
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{model.total_runs.toLocaleString()} runs</span>
        </div>

        {/* Rating */}
        {model.avg_rating !== null && model.total_ratings > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span>
              {model.avg_rating.toFixed(1)} ({model.total_ratings})
            </span>
          </div>
        )}

        {/* Difficulty */}
        <div
          className={`ml-auto px-2 py-0.5 text-xs rounded ${
            model.difficulty === 'basic'
              ? 'bg-green-100 text-green-700'
              : model.difficulty === 'intermediate'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {model.difficulty}
        </div>
      </div>
    </Link>
  );
}
