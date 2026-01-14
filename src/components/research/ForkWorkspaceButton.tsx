// src/components/research/ForkWorkspaceButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ForkWorkspaceButtonProps {
  workspaceId: string;
  workspaceName: string;
  labType: string;
}

const labTypeUrls: Record<string, string> = {
  econ: '/products/econ',
  macro: '/products/econ/macro',
  derivatives: '/products/derivatives',
  none: '/products/econ', // default fallback
};

export default function ForkWorkspaceButton({
  workspaceId,
  workspaceName,
  labType
}: ForkWorkspaceButtonProps) {
  const router = useRouter();
  const [isForking, setIsForking] = useState(false);
  const [error, setError] = useState('');

  async function handleFork() {
    if (!confirm(`Fork workspace "${workspaceName}"? This will create a copy you can modify in your ${labType} lab.`)) {
      return;
    }

    setIsForking(true);
    setError('');

    try {
      const response = await fetch(`/api/workspaces/fork/${workspaceId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();

        // Navigate to the appropriate lab with the forked workspace
        const labUrl = labTypeUrls[labType] || labTypeUrls.none;
        router.push(`${labUrl}?workspace=${data.workspace.id}`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to fork workspace');
      }
    } catch (err) {
      console.error('Fork workspace error:', err);
      setError('Failed to fork workspace');
    } finally {
      setIsForking(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleFork}
        disabled={isForking}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        {isForking ? 'Forking...' : 'Replicate Analysis'}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600">{error}</div>
      )}
    </div>
  );
}
