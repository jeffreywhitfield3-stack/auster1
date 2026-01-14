// src/components/models/ModelFilters.tsx
'use client';

import { useState } from 'react';
import type { LabScope, ModelDifficulty } from '@/types/models';

interface ModelFiltersProps {
  lab?: LabScope;
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  search: string;
  tags: string[];
  difficulty: ModelDifficulty | '';
  sort: 'popular' | 'newest' | 'top_rated';
}

const COMMON_TAGS = [
  'volatility',
  'momentum',
  'mean-reversion',
  'correlation',
  'options',
  'spreads',
  'risk-management',
  'backtesting',
  'technical-analysis',
  'fundamental-analysis',
];

export default function ModelFilters({ lab, onFilterChange }: ModelFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tags: [],
    difficulty: '',
    sort: 'popular',
  });

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    updateFilters({ tags: newTags });
  };

  const clearFilters = () => {
    const cleared: FilterState = {
      search: '',
      tags: [],
      difficulty: '',
      sort: 'popular',
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters =
    filters.search !== '' || filters.tags.length > 0 || filters.difficulty !== '';

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 mb-6">
      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Search models
        </label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          placeholder="Search by name or description..."
          className="w-full px-3 py-2 bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sort */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Sort by
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => updateFilters({ sort: 'popular' })}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              filters.sort === 'popular'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            Most Popular
          </button>
          <button
            onClick={() => updateFilters({ sort: 'newest' })}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              filters.sort === 'newest'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => updateFilters({ sort: 'top_rated' })}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              filters.sort === 'top_rated'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            Top Rated
          </button>
        </div>
      </div>

      {/* Difficulty */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Difficulty
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => updateFilters({ difficulty: '' })}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filters.difficulty === ''
                ? 'bg-zinc-800 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => updateFilters({ difficulty: 'basic' })}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filters.difficulty === 'basic'
                ? 'bg-green-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            Basic
          </button>
          <button
            onClick={() => updateFilters({ difficulty: 'intermediate' })}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filters.difficulty === 'intermediate'
                ? 'bg-yellow-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            Intermediate
          </button>
          <button
            onClick={() => updateFilters({ difficulty: 'advanced' })}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filters.difficulty === 'advanced'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            Advanced
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {COMMON_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                filters.tags.includes(tag)
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full px-4 py-2 text-sm text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
