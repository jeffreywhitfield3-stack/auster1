"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { Bell, Mail, TrendingUp, BarChart, Calendar } from "lucide-react";

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
  const [stats, setStats] = useState<any>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const supabase = createBrowserClient();

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
          setStats({
            emailOpens: data.email_opens,
            emailClicks: data.email_clicks,
            lastOpened: data.last_email_opened_at,
            lastClicked: data.last_email_clicked_at,
            subscribedAt: data.subscribed_at,
          });
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

      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
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
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
          <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const emailPreferences = [
    {
      key: "weekly_briefs" as keyof NotificationPreferences,
      icon: Mail,
      title: "Weekly Briefs",
      description:
        "Receive our weekly market analysis with top trade ideas and economic events every Sunday at 6 PM ET",
      badge: "Sundays 6 PM ET",
    },
    {
      key: "trade_alerts" as keyof NotificationPreferences,
      icon: TrendingUp,
      title: "Trade Alerts",
      description:
        "Get notified when your watchlist alerts trigger (unusual activity, IV rank changes, etc.)",
      badge: "Real-time",
    },
    {
      key: "research_updates" as keyof NotificationPreferences,
      icon: BarChart,
      title: "Research Updates",
      description: "Be notified when new research is published on the Research Stage",
      badge: "As published",
    },
    {
      key: "market_events" as keyof NotificationPreferences,
      icon: Calendar,
      title: "Market Events",
      description:
        "Get reminders about important market events (earnings, Fed meetings, economic releases)",
      badge: "Event-based",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Unsubscribed Warning */}
      {!isActive && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">
            You are currently unsubscribed
          </h3>
          <p className="text-neutral-300 text-sm mb-4">
            You won't receive any emails from us. Click below to resubscribe and
            start receiving updates again.
          </p>
          <button
            onClick={handleResubscribe}
            disabled={saving}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
          >
            {saving ? "Resubscribing..." : "Resubscribe to Emails"}
          </button>
        </div>
      )}

      {/* Email Address */}
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Email Notifications
        </h2>
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-neutral-400" />
          <div>
            <div className="text-sm font-medium text-neutral-400">
              Sending emails to
            </div>
            <div className="text-white">{email}</div>
          </div>
        </div>
      </div>

      {/* Email Preferences */}
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Notification Preferences
        </h3>

        <div className="space-y-4">
          {emailPreferences.map((pref) => {
            const Icon = pref.icon;
            return (
              <label
                key={pref.key}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? "border-neutral-600 hover:border-neutral-500 bg-neutral-800/30"
                    : "border-neutral-700 bg-neutral-800/10 opacity-50 cursor-not-allowed"
                }`}
              >
                <input
                  type="checkbox"
                  checked={preferences[pref.key]}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      [pref.key]: e.target.checked,
                    })
                  }
                  disabled={!isActive}
                  className="mt-1 h-5 w-5 rounded border-neutral-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <Icon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{pref.title}</span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                      {pref.badge}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400">{pref.description}</p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Action Buttons */}
        {isActive && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-neutral-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>

            <button
              onClick={handleUnsubscribeAll}
              disabled={saving}
              className="bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:cursor-not-allowed text-neutral-300 hover:text-white px-6 py-3 rounded-lg transition-colors border border-neutral-600"
            >
              Unsubscribe from All
            </button>
          </div>
        )}
      </div>

      {/* Email Statistics */}
      {stats && isActive && (
        <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Email Activity
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">
                {stats.emailOpens}
              </div>
              <div className="text-sm text-neutral-400">Emails Opened</div>
            </div>

            <div className="bg-neutral-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">
                {stats.emailClicks}
              </div>
              <div className="text-sm text-neutral-400">Links Clicked</div>
            </div>

            {stats.subscribedAt && (
              <div className="bg-neutral-800/50 rounded-lg p-4 col-span-2">
                <div className="text-sm text-neutral-400">Subscribed since</div>
                <div className="text-white">
                  {new Date(stats.subscribedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
