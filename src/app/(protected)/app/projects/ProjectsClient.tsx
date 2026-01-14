"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

type Workspace = {
  id: string;
  name: string;
  description: string | null;
  product: string;
  state: any;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
};

type SavedModel = {
  id: string;
  slug: string;
  name: string;
  description: string;
  lab_scope: string;
  tags: string[];
  difficulty: string;
  visibility: string;
  total_runs: number;
  saved_count: number;
  avg_rating: number | null;
  created_at: string;
  owner: {
    email: string;
    display_name: string | null;
  };
  saved_at: string;
  saved_notes: string | null;
  saved_id: string;
};

export default function ProjectsClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = useMemo(() => sp.get("next") || "", [sp]);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingModels, setLoadingModels] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterProduct, setFilterProduct] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "name">("recent");

  useEffect(() => {
    fetchWorkspaces();
    fetchSavedModels();
  }, []);

  async function fetchWorkspaces() {
    try {
      const response = await fetch('/api/workspaces/list');
      if (!response.ok) throw new Error('Failed to fetch workspaces');
      const data = await response.json();
      setWorkspaces(data.workspaces || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSavedModels() {
    try {
      const response = await fetch('/api/models/saved');
      if (response.ok) {
        const data = await response.json();
        setSavedModels(data.models || []);
      }
    } catch (err) {
      console.error('Failed to load saved models:', err);
    } finally {
      setLoadingModels(false);
    }
  }

  async function unsaveModel(savedId: string) {
    try {
      // Find the model to get its slug
      const model = savedModels.find(m => m.saved_id === savedId);
      if (!model) return;

      const response = await fetch(`/api/models/${model.slug}/save`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSavedModels(savedModels.filter(m => m.saved_id !== savedId));
      } else {
        throw new Error('Failed to unsave model');
      }
    } catch (err) {
      alert('Failed to unsave model');
    }
  }

  async function deleteWorkspace(id: string) {
    if (!confirm('Are you sure you want to delete this workspace?')) return;

    try {
      const response = await fetch(`/api/workspaces/delete?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWorkspaces(workspaces.filter(w => w.id !== id));
      } else {
        throw new Error('Failed to delete workspace');
      }
    } catch (err) {
      alert('Failed to delete workspace');
    }
  }

  async function loadWorkspace(workspace: Workspace) {
    try {
      // Route to appropriate product based on workspace type
      const routes: Record<string, string> = {
        derivatives: '/products/derivatives',
        econ: '/products/econ/macro',
      };

      const route = routes[workspace.product];
      if (route) {
        // Store workspace data in localStorage for the product to pick up
        localStorage.setItem('loadWorkspace', JSON.stringify(workspace));
        router.push(route);
      }
    } catch (err) {
      alert('Failed to load workspace');
    }
  }

  const filteredWorkspaces = useMemo(() => {
    let filtered = workspaces;

    if (filterProduct) {
      filtered = filtered.filter(w => w.product === filterProduct);
    }

    if (sortBy === "recent") {
      filtered = [...filtered].sort((a, b) =>
        new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime()
      );
    } else {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [workspaces, filterProduct, sortBy]);

  const productIcons: Record<string, string> = {
    derivatives: "📊",
    econ: "🏛",
  };

  const productLabels: Record<string, string> = {
    derivatives: "Derivatives",
    econ: "Econ",
  };

  const productColors: Record<string, string> = {
    derivatives: "bg-blue-100 text-blue-700",
    econ: "bg-emerald-100 text-emerald-700",
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
                Your Workspaces
              </h1>
              <p className="mt-4 text-lg leading-7 text-zinc-600">
                Access your saved analyses and research across all products.
              </p>
            </div>
            {next && (
              <button
                onClick={() => router.push(next)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filters & Sort */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterProduct(null)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  filterProduct === null
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                All Products
              </button>
              {Object.entries(productLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilterProduct(key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                    filterProduct === key
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {productIcons[key]} {label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setSortBy("recent")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  sortBy === "recent"
                    ? "bg-zinc-900 text-white"
                    : "bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSortBy("name")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  sortBy === "name"
                    ? "bg-zinc-900 text-white"
                    : "bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Name
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-6">
          {loading && (
            <div className="text-center text-zinc-600">Loading workspaces...</div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-900">
              {error}
            </div>
          )}

          {!loading && !error && filteredWorkspaces.length === 0 && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-zinc-900">
                {filterProduct ? `No ${productLabels[filterProduct]} workspaces yet` : 'No saved workspaces yet'}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Save your analyses from any product lab to access them later.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/products/derivatives"
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  📊 Derivatives Lab
                </Link>
                <Link
                  href="/products/econ"
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  🏛 Econ Lab
                </Link>
              </div>
            </div>
          )}

          {!loading && !error && filteredWorkspaces.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredWorkspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${productColors[workspace.product]}`}>
                      {productIcons[workspace.product]} {productLabels[workspace.product]}
                    </span>
                    {workspace.is_public && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Public
                      </span>
                    )}
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 line-clamp-2">
                    {workspace.name}
                  </h3>

                  {workspace.description && (
                    <p className="mb-4 text-sm text-zinc-600 line-clamp-2">
                      {workspace.description}
                    </p>
                  )}

                  <div className="mb-4 text-xs text-zinc-500">
                    Last accessed {new Date(workspace.last_accessed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => loadWorkspace(workspace)}
                      className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteWorkspace(workspace.id)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Saved Models Section */}
      {!loadingModels && savedModels.length > 0 && (
        <section className="border-t border-zinc-200 bg-white py-12">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="mb-6 text-2xl font-bold text-zinc-900">Saved Models</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedModels.map((model) => (
                <div
                  key={model.saved_id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      model.lab_scope === 'econ'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {model.lab_scope === 'econ' ? '🏛 Econ' : '📊 Derivatives'}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                      {model.difficulty}
                    </span>
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 line-clamp-2">
                    {model.name}
                  </h3>

                  <p className="mb-3 text-sm text-zinc-600 line-clamp-2">
                    {model.description}
                  </p>

                  {model.saved_notes && (
                    <p className="mb-3 text-xs italic text-zinc-500 line-clamp-1">
                      Note: {model.saved_notes}
                    </p>
                  )}

                  <div className="mb-3 flex flex-wrap gap-1">
                    {model.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mb-4 flex items-center gap-3 text-xs text-zinc-500">
                    <span>▶ {model.total_runs} runs</span>
                    {model.avg_rating && <span>⭐ {model.avg_rating.toFixed(1)}</span>}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/models/${model.slug}`}
                      className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => unsaveModel(model.saved_id)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Quick Access */}
      {!loading && !error && (
        <section className="border-t border-zinc-200 bg-zinc-50 py-12">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="mb-6 text-2xl font-bold text-zinc-900">Quick Access</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/products/derivatives"
                className="rounded-lg border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-sm"
              >
                <div className="mb-2 text-2xl">📊</div>
                <h3 className="mb-1 font-semibold text-zinc-900">Derivatives Lab</h3>
                <p className="text-sm text-zinc-600">Options analysis and strategy builder</p>
              </Link>
              <Link
                href="/products/econ"
                className="rounded-lg border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-sm"
              >
                <div className="mb-2 text-2xl">🏛</div>
                <h3 className="mb-1 font-semibold text-zinc-900">Econ Lab</h3>
                <p className="text-sm text-zinc-600">Economic research and analysis</p>
              </Link>
              <Link
                href="/research/browse"
                className="rounded-lg border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-sm"
              >
                <div className="mb-2 text-2xl">📚</div>
                <h3 className="mb-1 font-semibold text-zinc-900">Research Stage</h3>
                <p className="text-sm text-zinc-600">Browse and publish research</p>
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}