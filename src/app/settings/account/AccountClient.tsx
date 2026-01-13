"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { User, Mail, Calendar, Trash2 } from "lucide-react";

export default function AccountClient() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    if (
      !confirm(
        "This will permanently delete all your data, including saved sessions, usage history, and preferences. Are you absolutely sure?"
      )
    ) {
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      // Call delete account API
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      setMessage({
        type: "error",
        text: "Failed to delete account. Please contact support.",
      });
      setDeleting(false);
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

  if (!user) {
    return (
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-8">
        <p className="text-neutral-400">Not authenticated. Please sign in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <User className="w-5 h-5" />
          Account Information
        </h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-neutral-400 mt-1" />
            <div>
              <div className="text-sm font-medium text-neutral-400">Email</div>
              <div className="text-white">{user.email}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-neutral-400 mt-1" />
            <div>
              <div className="text-sm font-medium text-neutral-400">
                Account Created
              </div>
              <div className="text-white">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-neutral-400 mt-1" />
            <div>
              <div className="text-sm font-medium text-neutral-400">User ID</div>
              <div className="text-neutral-500 text-sm font-mono">{user.id}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Preferences Quick Link */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-2">
          Update Email Address
        </h3>
        <p className="text-neutral-300 text-sm mb-4">
          To change your email address, please contact support. We'll verify your
          identity and update your email securely.
        </p>
        <a
          href="/support"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
        >
          Contact Support
        </a>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Danger Zone
        </h3>
        <p className="text-neutral-300 text-sm mb-4">
          Once you delete your account, there is no going back. This will
          permanently delete:
        </p>
        <ul className="text-neutral-300 text-sm space-y-1 mb-4 list-disc list-inside">
          <li>All saved sessions and workspaces</li>
          <li>Usage history and analytics</li>
          <li>Email preferences and subscriptions</li>
          <li>Billing history (if applicable)</li>
        </ul>

        {message && message.type === "error" && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{message.text}</p>
          </div>
        )}

        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
        >
          {deleting ? "Deleting Account..." : "Delete Account"}
        </button>
      </div>
    </div>
  );
}
