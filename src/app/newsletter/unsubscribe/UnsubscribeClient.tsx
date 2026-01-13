"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function UnsubscribeClient() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Check for URL params (from one-click unsubscribe)
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const successParam = searchParams.get("success");
    const errorParam = searchParams.get("error");

    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }

    if (successParam === "true") {
      setStatus("success");
      setMessage("You have been successfully unsubscribed from weekly briefs.");
    } else if (errorParam === "true") {
      setStatus("error");
      setMessage("There was an error processing your request. Please try again.");
    }
  }, [searchParams]);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    setStatus("idle");

    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to unsubscribe");
      }

      setStatus("success");
      setMessage("You have been successfully unsubscribed from weekly briefs.");
    } catch (error) {
      setStatus("error");
      setMessage("There was an error processing your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Unsubscribe from Weekly Briefs
          </h1>
          <p className="text-neutral-400">
            We're sorry to see you go. You can always resubscribe later.
          </p>
        </div>

        {status === "success" ? (
          <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-400 text-center">{message}</p>
            </div>
            <div className="space-y-3">
              <p className="text-neutral-400 text-sm text-center">
                You will no longer receive weekly economic briefs. However, you can:
              </p>
              <ul className="text-neutral-300 text-sm space-y-2 list-disc list-inside">
                <li>Still access your account and all features</li>
                <li>View published briefs on our website</li>
                <li>Resubscribe anytime from your settings</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Link
                href="/"
                className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg transition-colors text-center"
              >
                Return Home
              </Link>
              <Link
                href="/login"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-center"
              >
                Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUnsubscribe} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {status === "error" && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm text-center">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              {loading ? "Processing..." : "Unsubscribe"}
            </button>

            <div className="text-center">
              <Link
                href="/"
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Changed your mind? Return home
              </Link>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-neutral-700">
          <p className="text-xs text-neutral-500 text-center">
            This will only unsubscribe you from weekly economic briefs.
            <br />
            To manage all email preferences, please{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              sign in to your account
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
