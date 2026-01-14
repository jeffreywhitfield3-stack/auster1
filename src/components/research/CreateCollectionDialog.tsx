// src/components/research/CreateCollectionDialog.tsx
'use client';

import { useState } from 'react';

interface CreateCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (collectionId: string) => void;
}

const collectionTypes = [
  { value: 'topic', label: 'Topic', description: 'Group research by common theme or subject area' },
  { value: 'method', label: 'Method', description: 'Research using similar methodologies or approaches' },
  { value: 'institution', label: 'Institution', description: 'Research from a specific institution or lab' },
  { value: 'series', label: 'Series', description: 'Sequential or related research publications' },
];

export default function CreateCollectionDialog({ isOpen, onClose, onSuccess }: CreateCollectionDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [collectionType, setCollectionType] = useState('topic');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Collection name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/research/collections/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          collection_type: collectionType,
          visibility,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess(data.collection.id);
        handleClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create collection');
      }
    } catch (err) {
      console.error('Create collection error:', err);
      setError('Failed to create collection');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setName('');
    setDescription('');
    setCollectionType('topic');
    setVisibility('public');
    setError('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Create Collection</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Organize and curate related research
          </p>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-zinc-900">
            Collection name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Machine Learning Applications in Finance"
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-zinc-900">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this collection is about..."
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Collection Type */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-zinc-900">
            Collection type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {collectionTypes.map((type) => (
              <label
                key={type.value}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  collectionType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <input
                  type="radio"
                  name="collectionType"
                  value={type.value}
                  checked={collectionType === type.value}
                  onChange={(e) => setCollectionType(e.target.value)}
                  className="sr-only"
                />
                <div className="text-sm font-medium text-zinc-900">{type.label}</div>
                <div className="text-xs text-zinc-600">{type.description}</div>
              </label>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-zinc-900">
            Visibility
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-900">Public</div>
                <div className="text-xs text-zinc-600">Anyone can view</div>
              </div>
            </label>
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-900">Private</div>
                <div className="text-xs text-zinc-600">Only you can view</div>
              </div>
            </label>
          </div>
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
            disabled={isSubmitting || !name.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Collection'}
          </button>
        </div>
      </div>
    </div>
  );
}
