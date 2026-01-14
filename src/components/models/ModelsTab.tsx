// src/components/models/ModelsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ModelCard from './ModelCard';
import ModelFilters, { type FilterState } from './ModelFilters';
import type { Model, LabScope } from '@/types/models';

interface ModelsTabProps {
  lab?: LabScope;
}

export default function ModelsTab({ lab }: ModelsTabProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tags: [],
    difficulty: '',
    sort: 'popular',
  });

  useEffect(() => {
    fetchModels();
  }, [filters, page, lab]);

  const fetchModels = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (lab) params.set('lab', lab);
      if (filters.search) params.set('search', filters.search);
      if (filters.difficulty) params.set('difficulty', filters.difficulty);
      if (filters.sort) params.set('sort', filters.sort);
      params.set('page', page.toString());
      params.set('limit', '24');

      filters.tags.forEach((tag) => params.append('tags', tag));

      const response = await fetch(`/api/models?${params.toString()}`);

      if (!response.ok) {
        console.error('[ModelsTab] API request failed:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('[ModelsTab] Error response:', errorData);
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();

      setModels(data.models);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('[ModelsTab] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">
            {lab ? `${lab === 'econ' ? 'Econ Lab' : 'Derivatives Lab'} Models` : 'All Models'}
          </h1>
          <p className="text-zinc-600">
            Browse and run quantitative models for analysis and research
          </p>
        </div>
        <Link
          href="/models/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Model
        </Link>
      </div>

      {/* Filters */}
      <ModelFilters lab={lab} onFilterChange={handleFilterChange} />

      {/* Loading State */}
      {isLoading && (
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
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchModels}
            className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Models Grid */}
      {!isLoading && !error && (
        <>
          {models.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {models.map((model) => (
                  <ModelCard key={model.id} model={model} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm bg-white border border-zinc-300 text-zinc-900 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-zinc-300 text-zinc-900 hover:bg-zinc-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-sm bg-white border border-zinc-300 text-zinc-900 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-zinc-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-zinc-900 mb-1">
                No models found
              </h3>
              <p className="text-zinc-600">
                Try adjusting your filters or search terms
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
