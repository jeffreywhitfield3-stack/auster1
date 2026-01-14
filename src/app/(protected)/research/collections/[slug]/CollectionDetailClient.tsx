// src/app/(protected)/research/collections/[slug]/CollectionDetailClient.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CollectionDetailClientProps {
  collectionId: string;
}

interface ResearchObject {
  id: string;
  title: string;
  slug: string;
  abstract: string;
  object_type: string;
  tags: string[];
  topics: string[];
  status: string;
  published_at: string;
  views_count: number;
  citations_count: number;
  author: {
    id: string;
    display_name: string;
    slug: string;
    avatar_url: string | null;
    tier: string;
  };
}

interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  collection_type: string;
  visibility: string;
  created_at: string;
  curator: {
    id: string;
    display_name: string;
    slug: string;
    avatar_url: string | null;
    tier: string;
  };
  research_objects: Array<{
    id: string;
    position: number;
    added_at: string;
    research_object: ResearchObject;
  }>;
  research_count: number;
}

const typeLabels: Record<string, string> = {
  topic: 'Topic Collection',
  method: 'Method Collection',
  institution: 'Institution Collection',
  series: 'Research Series',
};

export default function CollectionDetailClient({ collectionId }: CollectionDetailClientProps) {
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCurator, setIsCurator] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCollection();
  }, [collectionId]);

  async function fetchCollection() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/research/collections/${collectionId}`);
      if (response.ok) {
        const data = await response.json();
        setCollection(data.collection);

        // Check if current user is the curator
        // We'd need to add an endpoint to check current user's profile
        // For now, this is a placeholder
      } else if (response.status === 404) {
        router.push('/research/collections');
      }
    } catch (error) {
      console.error('Failed to fetch collection:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteCollection() {
    if (!confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/research/collections/${collectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/research/collections');
      }
    } catch (error) {
      console.error('Failed to delete collection:', error);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRemoveFromCollection(researchObjectId: string) {
    if (!confirm('Remove this research from the collection?')) return;

    try {
      const response = await fetch(
        `/api/research/collections/${collectionId}/members?researchObjectId=${researchObjectId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchCollection();
      }
    } catch (error) {
      console.error('Failed to remove from collection:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="text-zinc-600">Loading collection...</div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-600">
            <Link href="/research/collections" className="hover:text-blue-600">
              Collections
            </Link>
            <span>/</span>
            <span className="text-zinc-900">{collection.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-2 text-sm text-zinc-600">
                {typeLabels[collection.collection_type]}
              </div>
              <h1 className="mb-3 text-3xl font-bold text-zinc-900">{collection.name}</h1>
              {collection.description && (
                <p className="mb-4 text-zinc-600">{collection.description}</p>
              )}

              {/* Curator */}
              <div className="flex items-center gap-2">
                {collection.curator.avatar_url ? (
                  <img
                    src={collection.curator.avatar_url}
                    alt={collection.curator.display_name}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-zinc-200" />
                )}
                <div>
                  <p className="text-sm text-zinc-600">
                    Curated by{' '}
                    <Link
                      href={`/researchers/${collection.curator.slug}`}
                      className="font-medium text-zinc-900 hover:text-blue-600"
                    >
                      {collection.curator.display_name}
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Actions (for curator) */}
            {isCurator && (
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteCollection}
                  disabled={isDeleting}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Research List */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">
            Research ({collection.research_count})
          </h2>
        </div>

        {collection.research_objects.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white py-12 text-center">
            <div className="mb-3 text-4xl">📚</div>
            <p className="text-sm text-zinc-600">No research in this collection yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {collection.research_objects.map((membership) => {
              const research = membership.research_object;
              return (
                <div
                  key={membership.id}
                  className="rounded-lg border border-zinc-200 bg-white p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link
                        href={`/research/${research.slug}`}
                        className="text-lg font-semibold text-zinc-900 hover:text-blue-600"
                      >
                        {research.title}
                      </Link>

                      <p className="mt-2 text-sm text-zinc-600 line-clamp-2">
                        {research.abstract}
                      </p>

                      <div className="mt-3 flex items-center gap-4 text-sm text-zinc-600">
                        <Link
                          href={`/researchers/${research.author.slug}`}
                          className="hover:text-blue-600"
                        >
                          {research.author.display_name}
                        </Link>
                        <span>•</span>
                        <span className="capitalize">
                          {research.object_type.replace('_', ' ')}
                        </span>
                        <span>•</span>
                        <span>{research.views_count} views</span>
                        <span>•</span>
                        <span>{research.citations_count} citations</span>
                      </div>
                    </div>

                    {isCurator && (
                      <button
                        onClick={() => handleRemoveFromCollection(research.id)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                        title="Remove from collection"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
