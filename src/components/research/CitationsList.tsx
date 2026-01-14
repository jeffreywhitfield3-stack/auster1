// src/components/research/CitationsList.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Citation {
  id: string;
  citation_type: string;
  context: string | null;
  created_at: string;
  cited?: {
    id: string;
    slug: string;
    title: string;
    object_type: string;
    author: {
      display_name: string;
      slug: string;
      tier: string;
    };
  };
  citing?: {
    id: string;
    slug: string;
    title: string;
    object_type: string;
    author: {
      display_name: string;
      slug: string;
      tier: string;
    };
  };
}

interface CitationsListProps {
  researchObjectId: string;
  isAuthor: boolean;
  onDelete?: () => void;
}

const citationTypeLabels: Record<string, string> = {
  builds_on: 'Builds on',
  replicates: 'Replicates',
  challenges: 'Challenges',
  uses_method: 'Uses method',
  references: 'References',
};

const citationTypeColors: Record<string, string> = {
  builds_on: 'bg-blue-100 text-blue-700',
  replicates: 'bg-green-100 text-green-700',
  challenges: 'bg-orange-100 text-orange-700',
  uses_method: 'bg-purple-100 text-purple-700',
  references: 'bg-gray-100 text-gray-700',
};

export default function CitationsList({ researchObjectId, isAuthor, onDelete }: CitationsListProps) {
  const [activeTab, setActiveTab] = useState<'references' | 'cited_by'>('references');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citedBy, setCitedBy] = useState<Citation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCitations();
  }, [researchObjectId]);

  async function fetchCitations() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/research/citations/${researchObjectId}`);
      if (response.ok) {
        const data = await response.json();
        setCitations(data.citations || []);
        setCitedBy(data.cited_by || []);
      }
    } catch (error) {
      console.error('Failed to fetch citations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(citationId: string) {
    if (!confirm('Are you sure you want to remove this citation?')) return;

    setDeletingId(citationId);
    try {
      const response = await fetch(
        `/api/research/citations/${researchObjectId}?citationId=${citationId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchCitations();
        onDelete?.();
      }
    } catch (error) {
      console.error('Failed to delete citation:', error);
    } finally {
      setDeletingId(null);
    }
  }

  const displayCitations = activeTab === 'references' ? citations : citedBy;
  const emptyMessage = activeTab === 'references'
    ? 'No references added yet'
    : 'Not cited by any research yet';

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8">
        <div className="flex items-center justify-center">
          <div className="text-gray-600">Loading citations...</div>
        </div>
      </div>
    );
  }

  const totalCitations = citations.length + citedBy.length;

  if (totalCitations === 0 && !isAuthor) {
    return null; // Don't show empty citations section to non-authors
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Citations</h2>
          <div className="text-sm text-gray-600">
            {totalCitations} total
          </div>
        </div>

        <div className="flex border-t border-gray-200">
          <button
            onClick={() => setActiveTab('references')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'references'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            References ({citations.length})
          </button>
          <button
            onClick={() => setActiveTab('cited_by')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'cited_by'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Cited By ({citedBy.length})
          </button>
        </div>
      </div>

      {/* Citation List */}
      <div className="divide-y divide-gray-200">
        {displayCitations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 text-4xl">📎</div>
            <p className="text-sm text-gray-600">{emptyMessage}</p>
          </div>
        ) : (
          displayCitations.map((citation) => {
            const research = activeTab === 'references' ? citation.cited : citation.citing;
            if (!research) return null;

            return (
              <div key={citation.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Citation Type Badge */}
                    <div className="mb-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          citationTypeColors[citation.citation_type] || citationTypeColors.references
                        }`}
                      >
                        {citationTypeLabels[citation.citation_type] || citation.citation_type}
                      </span>
                    </div>

                    {/* Research Title */}
                    <Link
                      href={`/research/${research.slug}`}
                      className="text-base font-medium text-gray-900 hover:text-blue-600"
                    >
                      {research.title}
                    </Link>

                    {/* Author Info */}
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                      <span>by</span>
                      <Link
                        href={`/researchers/${research.author.slug}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {research.author.display_name}
                      </Link>
                      <span>•</span>
                      <span className="capitalize">{research.object_type.replace('_', ' ')}</span>
                    </div>

                    {/* Context Notes */}
                    {citation.context && (
                      <div className="mt-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                        {citation.context}
                      </div>
                    )}

                    {/* Date */}
                    <div className="mt-2 text-xs text-gray-500">
                      Added {new Date(citation.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Delete Button (only for own references) */}
                  {isAuthor && activeTab === 'references' && (
                    <button
                      onClick={() => handleDelete(citation.id)}
                      disabled={deletingId === citation.id}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
                      title="Remove citation"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
