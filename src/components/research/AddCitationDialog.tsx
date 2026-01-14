// src/components/research/AddCitationDialog.tsx
'use client';

import { useState } from 'react';

interface AddCitationDialogProps {
  isOpen: boolean;
  researchObjectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  object_type: string;
  author: {
    display_name: string;
    slug: string;
    tier: string;
  };
}

const citationTypes = [
  { value: 'builds_on', label: 'Builds on', description: 'This work extends or builds upon the cited work' },
  { value: 'replicates', label: 'Replicates', description: 'This work replicates the findings of the cited work' },
  { value: 'challenges', label: 'Challenges', description: 'This work challenges or questions the cited work' },
  { value: 'uses_method', label: 'Uses method', description: 'This work uses methods from the cited work' },
  { value: 'references', label: 'References', description: 'General reference to the cited work' },
];

export default function AddCitationDialog({ isOpen, researchObjectId, onClose, onSuccess }: AddCitationDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResearch, setSelectedResearch] = useState<SearchResult | null>(null);
  const [citationType, setCitationType] = useState('references');
  const [context, setContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSearch() {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const response = await fetch(
        `/api/research/search?q=${encodeURIComponent(searchQuery)}&limit=10&excludeId=${researchObjectId}`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      } else {
        setError('Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSubmit() {
    if (!selectedResearch) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/research/citations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citing_object_id: researchObjectId,
          cited_object_id: selectedResearch.id,
          citation_type: citationType,
          context: context || null,
        }),
      });

      if (response.ok) {
        onSuccess();
        handleClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add citation');
      }
    } catch (err) {
      console.error('Citation error:', err);
      setError('Failed to add citation');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResearch(null);
    setCitationType('references');
    setContext('');
    setError('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Add Citation</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Search for published research to cite in your work
          </p>
        </div>

        {!selectedResearch ? (
          <>
            {/* Search */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-zinc-900">
                Search research by title or author
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter search keywords..."
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || searchQuery.length < 2}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-700">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </p>
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => setSelectedResearch(result)}
                      className="w-full rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50"
                    >
                      <div className="mb-1 font-medium text-zinc-900">{result.title}</div>
                      <div className="mb-2 text-xs text-zinc-600 line-clamp-2">
                        {result.abstract}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>by {result.author.display_name}</span>
                        <span>•</span>
                        <span className="capitalize">{result.object_type.replace('_', ' ')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="py-8 text-center text-sm text-zinc-600">
                No research found matching your search
              </div>
            )}
          </>
        ) : (
          <>
            {/* Selected Research */}
            <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="font-medium text-zinc-900">{selectedResearch.title}</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    by {selectedResearch.author.display_name}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedResearch(null)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Citation Type */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-zinc-900">
                Citation type
              </label>
              <div className="space-y-2">
                {citationTypes.map((type) => (
                  <label key={type.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50">
                    <input
                      type="radio"
                      name="citationType"
                      value={type.value}
                      checked={citationType === type.value}
                      onChange={(e) => setCitationType(e.target.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-zinc-900">{type.label}</div>
                      <div className="text-xs text-zinc-600">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Context (Optional) */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-zinc-900">
                Context (optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Add notes about how this citation relates to your work..."
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Citation'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
