"use client";

import { useState } from "react";
import type { OptionLeg } from "@/lib/derivatives/calculations";
import Tip from "../Tip";

interface LegsListProps {
  legs: OptionLeg[];
  onUpdateLeg: (id: string, updates: Partial<OptionLeg>) => void;
  onDeleteLeg: (id: string) => void;
  onReorderLegs: (newOrder: OptionLeg[]) => void;
}

export default function LegsList({
  legs,
  onUpdateLeg,
  onDeleteLeg,
  onReorderLegs,
}: LegsListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingLeg, setEditingLeg] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<OptionLeg>>({});

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newLegs = [...legs];
    const draggedLeg = newLegs[draggedIndex];
    newLegs.splice(draggedIndex, 1);
    newLegs.splice(index, 0, draggedLeg);

    onReorderLegs(newLegs);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleFlipPosition = (id: string, currentPosition: "buy" | "sell") => {
    onUpdateLeg(id, { position: currentPosition === "buy" ? "sell" : "buy" });
  };

  const startEditing = (leg: OptionLeg) => {
    setEditingLeg(leg.id);
    setEditValues({
      strike: leg.strike,
      price: leg.price,
      quantity: leg.quantity,
    });
  };

  const saveEdits = (id: string) => {
    onUpdateLeg(id, editValues);
    setEditingLeg(null);
    setEditValues({});
  };

  const cancelEdits = () => {
    setEditingLeg(null);
    setEditValues({});
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const getLegCost = (leg: OptionLeg) => {
    const cost = leg.price * leg.quantity * 100;
    return leg.position === "buy" ? -cost : cost;
  };

  if (legs.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center">
        <div className="text-4xl">📋</div>
        <div className="mt-3 font-semibold text-zinc-900">No legs added yet</div>
        <div className="mt-1 text-sm text-zinc-600">
          Use a template or add legs manually to build your strategy
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-zinc-900">
            Strategy Legs ({legs.length})
          </h3>
          <Tip label="">
            <p className="mb-2">
              <strong>Drag</strong> to reorder legs
            </p>
            <p className="mb-2">
              <strong>Click</strong> to edit strike, price, or quantity
            </p>
            <p className="mb-2">
              <strong>Flip</strong> to switch between buy/sell
            </p>
            <p>
              <strong>Delete</strong> to remove a leg
            </p>
          </Tip>
        </div>
      </div>

      <div className="space-y-2">
        {legs.map((leg, index) => (
          <div
            key={leg.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`group relative rounded-xl border bg-white p-4 transition-all ${
              draggedIndex === index
                ? "border-zinc-400 opacity-50"
                : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            {/* Drag Handle */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
              ⋮⋮
            </div>

            {editingLeg === leg.id ? (
              // Edit Mode
              <div className="ml-6 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      Strike
                    </label>
                    <input
                      type="number"
                      value={editValues.strike ?? leg.strike}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          strike: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={editValues.price ?? leg.price}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          price: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editValues.quantity ?? leg.quantity}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          quantity: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdits(leg.id)}
                    className="flex-1 rounded-lg bg-zinc-900 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdits}
                    className="flex-1 rounded-lg border border-zinc-300 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Display Mode
              <div className="ml-6 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase ${
                        leg.position === "buy"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {leg.position}
                    </span>
                    <span className="font-semibold text-zinc-900">
                      {leg.quantity}x
                    </span>
                    <span className="text-zinc-600">
                      {leg.strike} {leg.type.toUpperCase()}
                    </span>
                    <span className="text-sm text-zinc-500">
                      @ {formatPrice(leg.price)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-4 text-xs text-zinc-500">
                    <span>
                      Cost:{" "}
                      <span
                        className={`font-semibold ${
                          getLegCost(leg) > 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {getLegCost(leg) > 0 ? "+" : ""}
                        {formatPrice(Math.abs(getLegCost(leg)))}
                      </span>
                    </span>
                    {leg.delta !== null && leg.delta !== undefined && (
                      <span>Delta: {leg.delta.toFixed(2)}</span>
                    )}
                    {leg.theta !== null && leg.theta !== undefined && (
                      <span>Theta: ${(leg.theta * leg.quantity * 100).toFixed(2)}/day</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditing(leg)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    title="Edit leg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleFlipPosition(leg.id, leg.position)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    title="Flip buy/sell"
                  >
                    Flip
                  </button>
                  <button
                    onClick={() => onDeleteLeg(leg.id)}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    title="Delete leg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <div className="flex items-start gap-2">
          <div className="text-base">💡</div>
          <div>
            <span className="font-semibold">Tip:</span> Drag legs to reorder them
            for better visualization. Most traders order from lowest to highest
            strike.
          </div>
        </div>
      </div>
    </div>
  );
}
