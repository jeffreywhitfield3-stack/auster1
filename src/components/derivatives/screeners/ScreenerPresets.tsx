"use client";

import { useState } from "react";

interface ScreenerPreset {
  id: string;
  name: string;
  type: "iron_condor" | "vertical" | "volatility" | "anomaly";
  filters: Record<string, any>;
  createdAt: string;
}

interface ScreenerPresetsProps {
  onLoadPreset: (preset: ScreenerPreset) => void;
  currentFilters?: Record<string, any>;
}

export default function ScreenerPresets({ onLoadPreset, currentFilters }: ScreenerPresetsProps) {
  const [presets, setPresets] = useState<ScreenerPreset[]>([
    {
      id: "1",
      name: "Conservative Iron Condors",
      type: "iron_condor",
      filters: {
        minDTE: 30,
        maxDTE: 45,
        minPOP: 70,
        maxCapital: 5000,
        minLiquidity: 1000,
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      name: "High IV Sell Premium",
      type: "volatility",
      filters: {
        minIVRank: 75,
        opportunity: "high",
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: "3",
      name: "Quick Weekly Spreads",
      type: "vertical",
      filters: {
        minDTE: 7,
        maxDTE: 14,
        direction: "bullish",
        minPOP: 60,
      },
      createdAt: new Date().toISOString(),
    },
  ]);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetType, setNewPresetType] = useState<ScreenerPreset["type"]>("iron_condor");

  const handleSave = () => {
    if (!newPresetName.trim() || !currentFilters) return;

    const newPreset: ScreenerPreset = {
      id: Date.now().toString(),
      name: newPresetName,
      type: newPresetType,
      filters: currentFilters,
      createdAt: new Date().toISOString(),
    };

    setPresets([...presets, newPreset]);
    setNewPresetName("");
    setShowSaveDialog(false);
  };

  const handleDelete = (id: string) => {
    setPresets(presets.filter(p => p.id !== id));
  };

  const getTypeLabel = (type: ScreenerPreset["type"]) => {
    const labels = {
      iron_condor: "Iron Condor",
      vertical: "Vertical Spread",
      volatility: "Volatility",
      anomaly: "Anomaly",
    };
    return labels[type];
  };

  const getTypeColor = (type: ScreenerPreset["type"]) => {
    const colors = {
      iron_condor: "bg-blue-100 text-blue-800",
      vertical: "bg-green-100 text-green-800",
      volatility: "bg-violet-100 text-violet-800",
      anomaly: "bg-amber-100 text-amber-800",
    };
    return colors[type];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Saved Presets</h3>
          <p className="text-sm text-zinc-600">Quick access to your favorite screener configurations</p>
        </div>
        <button
          onClick={() => setShowSaveDialog(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          + Save Current
        </button>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-zinc-900">Save Preset</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-700">Preset Name</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="My Custom Screener"
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700">Type</label>
              <select
                value={newPresetType}
                onChange={(e) => setNewPresetType(e.target.value as any)}
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="iron_condor">Iron Condor</option>
                <option value="vertical">Vertical Spread</option>
                <option value="volatility">Volatility</option>
                <option value="anomaly">Anomaly</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!newPresetName.trim()}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewPresetName("");
                }}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Presets List */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-semibold text-zinc-900">{preset.name}</div>
                <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getTypeColor(preset.type)}`}>
                  {getTypeLabel(preset.type)}
                </div>
              </div>
              <button
                onClick={() => handleDelete(preset.id)}
                className="text-zinc-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-1 text-xs text-zinc-600">
              {Object.entries(preset.filters).slice(0, 3).map(([key, value]) => (
                <div key={key}>
                  <span className="font-semibold">{key}:</span> {String(value)}
                </div>
              ))}
              {Object.keys(preset.filters).length > 3 && (
                <div className="text-zinc-500">+{Object.keys(preset.filters).length - 3} more filters</div>
              )}
            </div>

            <button
              onClick={() => onLoadPreset(preset)}
              className="mt-3 w-full rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Load Preset
            </button>
          </div>
        ))}
      </div>

      {presets.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
          No saved presets yet. Save your current screener settings to quickly access them later.
        </div>
      )}
    </div>
  );
}
