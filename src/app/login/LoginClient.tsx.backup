// src/app/login/LoginClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ArrowLeft, Mail, Lock, TrendingUp, BarChart3 } from "lucide-react";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const supabase = useMemo(() => supabaseBrowser(), []);

  const nextUrl = useMemo(() => {
    const n = sp.get("next");
    // basic safety: only allow internal paths
    if (!n || !n.startsWith("/")) return "/";
    return n;
  }, [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  // Opt-in preferences for signup
  const [optInEconBrief, setOptInEconBrief] = useState(true);
  const [optInOptionsBrief, setOptInOptionsBrief] = useState(true);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("Signing in…");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    setStatus("");
    setLoading(false);
    router.replace(nextUrl);
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("Creating account…");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(nextUrl)}`,
        data: {
          opt_in_econ_brief: optInEconBrief,
          opt_in_options_brief: optInOptionsBrief,
        },
      },
    });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    // Check if email confirmation is required
    if (data?.user && !data.session) {
      setStatus(
        "Account created! Please check your email to verify your account. Check your spam folder if you don't see it."
      );
    } else if (data?.session) {
      setStatus("Account created and signed in!");
      setTimeout(() => router.replace(nextUrl), 1500);
    }

    setLoading(false);
  }

  async function onForgotPassword(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setStatus("Please enter your email address");
      return;
    }

    setLoading(true);
    setStatus("Sending password reset email…");

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    setStatus("Password reset email sent! Check your inbox.");
    setLoading(false);
    setShowForgotPassword(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">
            {showForgotPassword ? "Reset Password" : isSignup ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-sm text-zinc-600">
            {showForgotPassword
              ? "We'll send you a link to reset your password"
              : isSignup
              ? "Join thousands of traders making smarter decisions"
              : "Sign in to continue to your dashboard"}
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg">
          {status && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${
              status.includes("error") || status.includes("failed")
                ? "bg-red-50 border border-red-200 text-red-900"
                : status.includes("sent") || status.includes("created")
                ? "bg-green-50 border border-green-200 text-green-900"
                : "bg-blue-50 border border-blue-200 text-blue-900"
            }`}>
              {status}
            </div>
          )}

          {!showForgotPassword ? (
            <>
              <form className="space-y-4" onSubmit={isSignup ? onSignup : onSubmit}>
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <input
                      className="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="you@example.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <input
                      className="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={isSignup ? "Choose a secure password" : "Enter your password"}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      required
                    />
                  </div>
                </div>

                {/* Weekly Brief Opt-ins (only show during signup) */}
                {isSignup && (
                  <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      Stay Informed (Recommended)
                    </p>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={optInEconBrief}
                        onChange={(e) => setOptInEconBrief(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            Economic News & Data Insights
                          </span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                          Weekly roundup of key economic indicators, policy changes, and market-moving data releases
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={optInOptionsBrief}
                        onChange={(e) => setOptInOptionsBrief(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            Options Market Opportunities
                          </span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                          Curated analysis of high-probability options setups, unusual activity, and volatility trends
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
                </button>

                {/* Toggle Signup/Login */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(!isSignup);
                      setStatus("");
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                  </button>
                </div>
              </form>

              {/* Forgot Password Link */}
              {!isSignup && (
                <div className="mt-6 pt-6 border-t border-zinc-200 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setShowForgotPassword(true);
                      setStatus("");
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-1"
                  >
                    Forgot password?
                  </button>
                  <span className="text-zinc-500">
                    Returns to: <span className="font-mono text-zinc-700">{nextUrl === "/" ? "Dashboard" : nextUrl}</span>
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <form className="space-y-4" onSubmit={onForgotPassword}>
                <p className="text-sm text-zinc-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <input
                      className="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="you@example.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Sending..." : "Send Reset Email"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setStatus("");
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-zinc-500">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </div>
      </div>
    </main>
  );
}
