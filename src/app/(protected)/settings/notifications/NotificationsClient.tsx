"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type NotificationPreferences = {
  weekly_briefs: boolean;
  trade_alerts: boolean;
  research_updates: boolean;
  market_events: boolean;
};

export default function NotificationsClient() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    weekly_briefs: true,
    trade_alerts: true,
    research_updates: true,
    market_events: true,
  });
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const supabase = supabaseBrowser();

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        setEmail(user.email || "");

        // Fetch subscription preferences
        const { data, error } = await supabase
          .from("newsletter_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching preferences:", error);
        } else if (data) {
          setPreferences({
            weekly_briefs: data.weekly_briefs,
            trade_alerts: data.trade_alerts,
            research_updates: data.research_updates,
            market_events: data.market_events,
          });
          setIsActive(data.is_active);
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      // Check if subscription exists
      const { data: existing } = await supabase
        .from("newsletter_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        // Update existing subscription
        const { error } = await supabase
          .from("newsletter_subscriptions")
          .update({
            ...preferences,
            is_active: isActive,
          })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from("newsletter_subscriptions")
          .insert({
            user_id: user.id,
            email: user.email,
            ...preferences,
            is_active: isActive,
            subscription_source: "settings",
          });

        if (error) throw error;
      }

      setMessage({
        type: "success",
        text: "Preferences saved successfully",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      setMessage({
        type: "error",
        text: "Failed to save preferences",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribeAll = async () => {
    if (!confirm("Are you sure you want to unsubscribe from all emails?")) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to unsubscribe");
      }

      setIsActive(false);
      setMessage({
        type: "success",
        text: "Unsubscribed from all emails",
      });
    } catch (error) {
      console.error("Error unsubscribing:", error);
      setMessage({
        type: "error",
        text: "Failed to unsubscribe",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResubscribe = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          preferences,
          source: "settings",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to resubscribe");
      }

      setIsActive(true);
      setMessage({
        type: "success",
        text: "Resubscribed successfully",
      });
    } catch (error) {
      console.error("Error resubscribing:", error);
      setMessage({
        type: "error",
        text: "Failed to resubscribe",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-zinc-600">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold text-zinc-900">
        Email Notifications
      </h1>

      {message && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {!isActive && (
        <div className="mb-6 rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
          <p className="font-semibold text-yellow-900">
            You are currently unsubscribed from all emails
          </p>
          <button
            onClick={handleResubscribe}
            disabled={saving}
            className="mt-3 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:bg-zinc-300"
          >
            {saving ? "Resubscribing..." : "Resubscribe"}
          </button>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900">
            Email Address
          </h2>
          <p className="text-zinc-600">{email}</p>
        </div>

        <div className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            Email Preferences
          </h2>

          <div className="space-y-4">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={preferences.weekly_briefs}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    weekly_briefs: e.target.checked,
                  })
                }
                disabled={!isActive}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <div className="ml-3">
                <span className="font-medium text-zinc-900">Weekly Briefs</span>
                <p className="text-sm text-zinc-600">
                  Receive our weekly market analysis with top trade ideas and
                  economic events every Sunday at 6 PM ET
                </p>
              </div>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={preferences.trade_alerts}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    trade_alerts: e.target.checked,
                  })
                }
                disabled={!isActive}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <div className="ml-3">
                <span className="font-medium text-zinc-900">Trade Alerts</span>
                <p className="text-sm text-zinc-600">
                  Get notified when your watchlist alerts trigger (unusual
                  activity, IV rank changes, etc.)
                </p>
              </div>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={preferences.research_updates}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    research_updates: e.target.checked,
                  })
                }
                disabled={!isActive}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <div className="ml-3">
                <span className="font-medium text-zinc-900">
                  Research Updates
                </span>
                <p className="text-sm text-zinc-600">
                  Be notified when new research is published on the Research
                  Stage
                </p>
              </div>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={preferences.market_events}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    market_events: e.target.checked,
                  })
                }
                disabled={!isActive}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <div className="ml-3">
                <span className="font-medium text-zinc-900">Market Events</span>
                <p className="text-sm text-zinc-600">
                  Get reminders about important market events (earnings, Fed
                  meetings, economic releases)
                </p>
              </div>
            </label>
          </div>
        </div>

        {isActive && (
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-zinc-300"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>

            <button
              onClick={handleUnsubscribeAll}
              disabled={saving}
              className="rounded-lg border border-red-300 bg-white px-6 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Unsubscribe from All
            </button>
          </div>
        )}
      </div>

      {/* Email Statistics */}
      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          Email Activity
        </h2>
        <p className="text-sm text-zinc-600">
          Email activity statistics coming soon...
        </p>
      </div>
    </div>
  );
}
