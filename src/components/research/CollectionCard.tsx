// src/components/research/CollectionCard.tsx
import Link from 'next/link';

interface CollectionCardProps {
  collection: {
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
  };
}

const typeLabels: Record<string, string> = {
  topic: 'Topic Collection',
  method: 'Method Collection',
  institution: 'Institution Collection',
  series: 'Research Series',
};

const typeIcons: Record<string, string> = {
  topic: '📚',
  method: '🔬',
  institution: '🏛️',
  series: '📖',
};

export default function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <Link
      href={`/research/collections/${collection.slug}`}
      className="block rounded-lg border border-zinc-200 bg-white p-6 transition-all hover:border-blue-500 hover:shadow-md"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{typeIcons[collection.collection_type]}</span>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">{collection.name}</h3>
            <p className="text-xs text-zinc-600">{typeLabels[collection.collection_type]}</p>
          </div>
        </div>
        {collection.visibility === 'private' && (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
            Private
          </span>
        )}
      </div>

      {/* Description */}
      {collection.description && (
        <p className="mb-4 text-sm text-zinc-600 line-clamp-2">
          {collection.description}
        </p>
      )}

      {/* Stats */}
      <div className="mb-4 flex items-center gap-4 text-sm text-zinc-600">
        <div className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>{collection.research_count} {collection.research_count === 1 ? 'item' : 'items'}</span>
        </div>
      </div>

      {/* Curator */}
      <div className="flex items-center gap-2 pt-4 border-t border-zinc-100">
        {collection.curator.avatar_url ? (
          <img
            src={collection.curator.avatar_url}
            alt={collection.curator.display_name}
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <div className="h-6 w-6 rounded-full bg-zinc-200" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-600">
            Curated by{' '}
            <span className="font-medium text-zinc-900">{collection.curator.display_name}</span>
          </p>
        </div>
        <span className={`text-xs font-medium ${
          collection.curator.tier === 'institution' ? 'text-purple-600' :
          collection.curator.tier === 'researcher' ? 'text-blue-600' :
          collection.curator.tier === 'contributor' ? 'text-green-600' :
          'text-zinc-600'
        }`}>
          {collection.curator.tier}
        </span>
      </div>
    </Link>
  );
}
