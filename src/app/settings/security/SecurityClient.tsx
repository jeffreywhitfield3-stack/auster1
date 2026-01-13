"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { Shield, Key, LogOut } from "lucide-react";

export default function SecurityClient() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const supabase = createBrowserClient();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "New passwords don't match",
      });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "Password must be at least 8 characters long",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Password changed successfully",
      });

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to change password",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!confirm("Are you sure you want to sign out?")) {
      return;
    }

    try {
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSignOutAllDevices = async () => {
    if (
      !confirm(
        "This will sign you out from all devices. You'll need to sign in again. Continue?"
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Sign out from all sessions
      await supabase.auth.signOut({ scope: "global" });
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      setMessage({
        type: "error",
        text: "Failed to sign out from all devices",
      });
    } finally {
      setLoading(false);
    }
  };

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

      {/* Change Password */}
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Key className="w-5 h-5" />
          Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              New Password
            </label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Re-enter new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-semibold"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-700">
          <h3 className="text-sm font-semibold text-neutral-300 mb-2">
            Password Requirements
          </h3>
          <ul className="text-sm text-neutral-400 space-y-1 list-disc list-inside">
            <li>At least 8 characters long</li>
            <li>Mix of uppercase and lowercase letters recommended</li>
            <li>Include numbers and special characters for better security</li>
          </ul>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Active Sessions
        </h2>

        <p className="text-neutral-300 text-sm mb-4">
          Manage your active sessions across all devices. If you notice any
          suspicious activity, sign out from all devices immediately.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleSignOut}
            className="bg-neutral-700 hover:bg-neutral-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out This Device
          </button>

          <button
            onClick={handleSignOutAllDevices}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-semibold"
          >
            {loading ? "Signing Out..." : "Sign Out All Devices"}
          </button>
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-3">
          Security Best Practices
        </h3>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>
              Use a unique password for your Austerian account that you don't use
              elsewhere
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>
              Consider using a password manager to generate and store strong
              passwords
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>
              Regularly review your account activity and sign out unused sessions
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>
              Never share your password or account credentials with anyone
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
