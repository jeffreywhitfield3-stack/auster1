// src/components/research/ResearchActions.tsx
'use client';

import { useState } from 'react';
import AddToCollectionDialog from './AddToCollectionDialog';
import ShareButton from './ShareButton';

interface ResearchActionsProps {
  researchObjectId: string;
  researchTitle?: string;
}

export default function ResearchActions({ researchObjectId, researchTitle }: ResearchActionsProps) {
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <ShareButton
        sourceType="research"
        sourceId={researchObjectId}
        title={researchTitle}
      />

      <button
        onClick={() => setIsAddToCollectionOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        title="Add to collection"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Add to Collection
      </button>

      <AddToCollectionDialog
        isOpen={isAddToCollectionOpen}
        researchObjectId={researchObjectId}
        onClose={() => setIsAddToCollectionOpen(false)}
      />
    </div>
  );
}
