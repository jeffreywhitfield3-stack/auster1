// src/app/(protected)/models/debug/page.tsx
// Debug page to check models in database

import { supabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata = {
  title: 'Models Debug | Auster',
  description: 'Debug models in the database',
};

export default async function ModelsDebugPage() {
  const supabase = await supabaseServer();

  // Get total count
  const { count, error: countError } = await supabase
    .from('models')
    .select('*', { count: 'exact', head: true });

  // Get all models
  const { data: models, error: modelsError } = await supabase
    .from('models')
    .select('id, slug, name, visibility, lab_scope, created_at, user_id')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Models Debug</h1>
        <p className="text-gray-600">Check models in the database</p>
      </div>

      {/* Stats */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        {countError ? (
          <p className="text-red-600">Error getting count: {countError.message}</p>
        ) : (
          <p className="text-lg">
            <strong>Total Models:</strong> {count ?? 0}
          </p>
        )}
      </div>

      {/* Error Display */}
      {modelsError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700">Error loading models: {modelsError.message}</p>
        </div>
      )}

      {/* Models List */}
      {models && models.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">All Models</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Slug</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Visibility</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Lab Scope</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Created At</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                      {model.slug}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {model.name}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          model.visibility === 'public'
                            ? 'bg-green-100 text-green-700'
                            : model.visibility === 'unlisted'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {model.visibility}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {model.lab_scope}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {new Date(model.created_at).toLocaleString()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <Link
                        href={`/models/${model.slug}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded">
          <p className="text-gray-600">No models found in the database</p>
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded">
        <h3 className="font-semibold text-gray-900 mb-2">Quick Links</h3>
        <div className="flex gap-4">
          <Link
            href="/models/create"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Create New Model
          </Link>
          <Link
            href="/models"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Browse Models
          </Link>
          <Link
            href="/products/econ/models"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Econ Lab Models
          </Link>
        </div>
      </div>
    </div>
  );
}
