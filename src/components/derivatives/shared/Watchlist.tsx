// Watchlist Component
// Save symbols and set custom alerts

"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Bell, TrendingUp } from "lucide-react";

interface Alert {
  id: string;
  type: "iv_rank" | "delta" | "vol_oi" | "price";
  condition: "above" | "below";
  threshold: number;
  triggered: boolean;
  triggeredAt?: Date;
}

interface WatchlistItem {
  symbol: string;
  addedAt: Date;
  alerts: Alert[];
}

interface WatchlistProps {
  onSymbolClick: (symbol: string) => void;
}

export default function Watchlist({ onSymbolClick }: WatchlistProps) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [showAddAlert, setShowAddAlert] = useState<string | null>(null);

  // Alert form state
  const [alertType, setAlertType] = useState<Alert["type"]>("price");
  const [alertCondition, setAlertCondition] = useState<Alert["condition"]>("above");
  const [alertThreshold, setAlertThreshold] = useState("");

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("derivatives_watchlist");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert date strings back to Date objects
      const items = parsed.map((item: any) => ({
        ...item,
        addedAt: new Date(item.addedAt),
        alerts: item.alerts.map((alert: any) => ({
          ...alert,
          triggeredAt: alert.triggeredAt ? new Date(alert.triggeredAt) : undefined,
        })),
      }));
      setWatchlist(items);
    }
  }, []);

  // Save watchlist to localStorage
  const saveWatchlist = (items: WatchlistItem[]) => {
    localStorage.setItem("derivatives_watchlist", JSON.stringify(items));
    setWatchlist(items);
  };

  // Add symbol to watchlist
  const addSymbol = () => {
    if (!newSymbol.trim()) return;

    const symbol = newSymbol.trim().toUpperCase();

    // Check if already exists
    if (watchlist.some((item) => item.symbol === symbol)) {
      alert("Symbol already in watchlist");
      return;
    }

    const newItem: WatchlistItem = {
      symbol,
      addedAt: new Date(),
      alerts: [],
    };

    saveWatchlist([...watchlist, newItem]);
    setNewSymbol("");

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  // Remove symbol from watchlist
  const removeSymbol = (symbol: string) => {
    saveWatchlist(watchlist.filter((item) => item.symbol !== symbol));
  };

  // Add alert to symbol
  const addAlert = (symbol: string) => {
    if (!alertThreshold) return;

    const newAlert: Alert = {
      id: `${Date.now()}-${Math.random()}`,
      type: alertType,
      condition: alertCondition,
      threshold: parseFloat(alertThreshold),
      triggered: false,
    };

    const updated = watchlist.map((item) => {
      if (item.symbol === symbol) {
        return {
          ...item,
          alerts: [...item.alerts, newAlert],
        };
      }
      return item;
    });

    saveWatchlist(updated);
    setShowAddAlert(null);
    setAlertThreshold("");
  };

  // Remove alert
  const removeAlert = (symbol: string, alertId: string) => {
    const updated = watchlist.map((item) => {
      if (item.symbol === symbol) {
        return {
          ...item,
          alerts: item.alerts.filter((alert) => alert.id !== alertId),
        };
      }
      return item;
    });

    saveWatchlist(updated);
  };

  const getAlertTypeLabel = (type: Alert["type"]) => {
    switch (type) {
      case "iv_rank":
        return "IV Rank";
      case "delta":
        return "Delta";
      case "vol_oi":
        return "Vol/OI";
      case "price":
        return "Price";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Watchlist</h2>
        <span className="text-sm text-neutral-400">
          {watchlist.length} symbol{watchlist.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Add Symbol */}
      <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSymbol()}
            placeholder="Add symbol (e.g., SPY)"
            className="flex-1 rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={addSymbol}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Watchlist Items */}
      <div className="space-y-3">
        {watchlist.length === 0 ? (
          <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-8 text-center">
            <TrendingUp className="mx-auto h-12 w-12 text-neutral-600 mb-3" />
            <p className="text-neutral-400 text-sm">
              Your watchlist is empty. Add symbols to track and set alerts.
            </p>
          </div>
        ) : (
          watchlist.map((item) => (
            <div
              key={item.symbol}
              className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4"
            >
              {/* Symbol Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => onSymbolClick(item.symbol)}
                  className="text-lg font-bold text-white hover:text-blue-400 transition-colors"
                >
                  {item.symbol}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddAlert(item.symbol)}
                    className="rounded-lg border border-neutral-600 bg-neutral-700 p-2 text-neutral-300 hover:bg-neutral-600 hover:text-white transition-colors"
                    title="Add Alert"
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeSymbol(item.symbol)}
                    className="rounded-lg border border-red-900/50 bg-red-900/20 p-2 text-red-400 hover:bg-red-900/40 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Alerts */}
              {item.alerts.length > 0 && (
                <div className="space-y-2">
                  {item.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between rounded-lg border p-2 text-sm ${
                        alert.triggered
                          ? "border-orange-500/50 bg-orange-500/10"
                          : "border-neutral-600 bg-neutral-900"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {alert.triggered && <span>🔥</span>}
                        <span className="text-neutral-300">
                          {getAlertTypeLabel(alert.type)} {alert.condition}{" "}
                          <span className="font-mono font-semibold text-white">
                            {alert.threshold}
                          </span>
                        </span>
                      </div>
                      <button
                        onClick={() => removeAlert(item.symbol, alert.id)}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Alert Form */}
              {showAddAlert === item.symbol && (
                <div className="mt-3 space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                  <div className="text-xs font-semibold text-blue-300">
                    New Alert
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Alert Type */}
                    <select
                      value={alertType}
                      onChange={(e) => setAlertType(e.target.value as Alert["type"])}
                      className="rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-xs text-white"
                    >
                      <option value="price">Price</option>
                      <option value="delta">Delta</option>
                      <option value="vol_oi">Vol/OI</option>
                      <option value="iv_rank">IV Rank</option>
                    </select>

                    {/* Condition */}
                    <select
                      value={alertCondition}
                      onChange={(e) => setAlertCondition(e.target.value as Alert["condition"])}
                      className="rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-xs text-white"
                    >
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                    </select>

                    {/* Threshold */}
                    <input
                      type="number"
                      step="0.01"
                      value={alertThreshold}
                      onChange={(e) => setAlertThreshold(e.target.value)}
                      placeholder="Value"
                      className="rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-xs text-white placeholder-neutral-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => addAlert(item.symbol)}
                      className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Add Alert
                    </button>
                    <button
                      onClick={() => setShowAddAlert(null)}
                      className="rounded border border-neutral-600 px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-neutral-300">
        <strong className="text-blue-300">💡 Tip:</strong> Alerts will trigger when
        conditions are met. Enable browser notifications to get notified instantly.
      </div>
    </div>
  );
}
