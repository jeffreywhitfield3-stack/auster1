// src/app/(protected)/research/collections/CollectionsBrowseClient.tsx
'use client';

import { useState, useEffect } from 'react';
import CollectionCard from '@/components/research/CollectionCard';
import CreateCollectionDialog from '@/components/research/CreateCollectionDialog';
import { useRouter } from 'next/navigation';

interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  collection_type: string;
  visibility: string;
  research_count: number;
  curator: {
    display_name: string;
    slug: string;
    avatar_url: string | null;
    tier: string;
  };
  created_at: string;
}

const collectionTypes = [
  { value: 'all', label: 'All Collections' },
  { value: 'topic', label: 'Topics' },
  { value: 'method', label: 'Methods' },
  { value: 'institution', label: 'Institutions' },
  { value: 'series', label: 'Series' },
];

export default function CollectionsBrowseClient() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, [selectedType, searchQuery]);

  async function fetchCollections() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }
      if (searchQuery.length >= 2) {
        params.append('q', searchQuery);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/research/collections/list?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCreateSuccess(collectionId: string) {
    fetchCollections();
    // Navigate to the new collection (we'd need to get the slug from the response)
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900">Research Collections</h1>
              <p className="mt-2 text-zinc-600">
                Discover curated collections of research organized by topic, method, and more
              </p>
            </div>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Create Collection
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            {collectionTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Collections Grid */}
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="text-zinc-600">Loading collections...</div>
          </div>
        ) : collections.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-3 text-6xl">📚</div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-900">No collections found</h3>
            <p className="mb-6 text-sm text-zinc-600">
              {searchQuery
                ? 'Try a different search term'
                : 'Be the first to create a collection!'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Collection
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        )}
      </div>

      {/* Create Collection Dialog */}
      <CreateCollectionDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
