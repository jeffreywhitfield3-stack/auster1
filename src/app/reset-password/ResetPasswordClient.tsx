"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-browser";

export default function ResetPasswordClient() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({
          type: "error",
          text: "Invalid or expired password reset link. Please request a new one.",
        });
      }
    };
    checkSession();
  }, [supabase]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Passwords don't match",
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
        text: "Password updated successfully! Redirecting to login...",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      console.error("Error resetting password:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to reset password",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold">Reset Your Password</div>

        {message && (
          <div
            className={`mt-3 rounded-lg border p-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : message.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <form className="mt-4 space-y-3" onSubmit={handleResetPassword}>
          <p className="text-xs text-zinc-600">
            Enter your new password below. Make sure it's at least 8 characters long.
          </p>

          <div>
            <input
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
              placeholder="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div>
            <input
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
              placeholder="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Updating password..." : "Update password"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Back to login
          </button>
        </form>

        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <h3 className="text-xs font-semibold text-blue-900 mb-1">
            Password Requirements:
          </h3>
          <ul className="text-xs text-blue-800 space-y-0.5 list-disc list-inside">
            <li>At least 8 characters long</li>
            <li>Mix of uppercase and lowercase recommended</li>
            <li>Include numbers and special characters for better security</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
