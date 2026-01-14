// src/components/research/CitationsSection.tsx
'use client';

import { useState } from 'react';
import CitationsList from './CitationsList';
import AddCitationDialog from './AddCitationDialog';

interface CitationsSectionProps {
  researchObjectId: string;
  isAuthor: boolean;
}

export default function CitationsSection({ researchObjectId, isAuthor }: CitationsSectionProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleCitationAdded() {
    setRefreshKey(prev => prev + 1);
  }

  return (
    <>
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Citations</h2>
          {isAuthor && (
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Add Citation
            </button>
          )}
        </div>

        <CitationsList
          key={refreshKey}
          researchObjectId={researchObjectId}
          isAuthor={isAuthor}
          onDelete={handleCitationAdded}
        />
      </div>

      <AddCitationDialog
        isOpen={isAddDialogOpen}
        researchObjectId={researchObjectId}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleCitationAdded}
      />
    </>
  );
}
