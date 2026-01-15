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
        {/* Comments */}
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{((model as any).comment_count || 0).toLocaleString()} comments</span>
        </div>

        {/* Likes/Saves */}
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{((model as any).like_count || 0).toLocaleString()} likes</span>
        </div>

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
