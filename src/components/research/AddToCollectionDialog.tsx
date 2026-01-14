// src/components/research/AddToCollectionDialog.tsx
'use client';

import { useState, useEffect } from 'react';

interface AddToCollectionDialogProps {
  isOpen: boolean;
  researchObjectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Collection {
  id: string;
  name: string;
  slug: string;
  collection_type: string;
  research_count: number;
}

const typeIcons: Record<string, string> = {
  topic: '📚',
  method: '🔬',
  institution: '🏛️',
  series: '📖',
};

export default function AddToCollectionDialog({
  isOpen,
  researchObjectId,
  onClose,
  onSuccess
}: AddToCollectionDialogProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [showCreateNew, setShowCreateNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUserCollections();
    }
  }, [isOpen]);

  async function fetchUserCollections() {
    setIsLoading(true);
    try {
      // Fetch user's collections (will be filtered to their own on backend)
      const response = await fetch('/api/research/collections/list?limit=50');
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddToCollection() {
    if (!selectedCollectionId) return;

    setIsAdding(true);
    setError('');

    try {
      const response = await fetch(
        `/api/research/collections/${selectedCollectionId}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ research_object_id: researchObjectId }),
        }
      );

      if (response.ok) {
        onSuccess?.();
        handleClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add to collection');
      }
    } catch (err) {
      console.error('Add to collection error:', err);
      setError('Failed to add to collection');
    } finally {
      setIsAdding(false);
    }
  }

  function handleClose() {
    setSelectedCollectionId(null);
    setError('');
    setShowCreateNew(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Add to Collection</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Select a collection to add this research to
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-zinc-600">
            Loading your collections...
          </div>
        ) : collections.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-3 text-4xl">📚</div>
            <p className="mb-4 text-sm text-zinc-600">
              You haven't created any collections yet
            </p>
            <button
              onClick={() => setShowCreateNew(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Your First Collection
            </button>
          </div>
        ) : (
          <>
            {/* Collections List */}
            <div className="mb-4 max-h-96 space-y-2 overflow-y-auto">
              {collections.map((collection) => (
                <label
                  key={collection.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    selectedCollectionId === collection.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="collection"
                    value={collection.id}
                    checked={selectedCollectionId === collection.id}
                    onChange={() => setSelectedCollectionId(collection.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{typeIcons[collection.collection_type]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900 truncate">
                          {collection.name}
                        </div>
                        <div className="text-xs text-zinc-600">
                          {collection.research_count} {collection.research_count === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Create New Link */}
            <button
              onClick={() => setShowCreateNew(true)}
              className="mb-4 w-full text-center text-sm text-blue-600 hover:text-blue-700"
            >
              + Create new collection
            </button>

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
                onClick={handleAddToCollection}
                disabled={!selectedCollectionId || isAdding}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : 'Add to Collection'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
