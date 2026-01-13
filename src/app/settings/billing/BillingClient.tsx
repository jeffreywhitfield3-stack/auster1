"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { CreditCard, CheckCircle, XCircle, ExternalLink } from "lucide-react";

type SubscriptionData = {
  status: string;
  priceId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
};

export default function BillingClient() {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        setUser(user);

        // Fetch subscription data
        const { data: subData } = await supabase
          .from("stripe_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();

        if (subData) {
          setSubscription({
            status: subData.status,
            priceId: subData.price_id,
            currentPeriodStart: subData.current_period_start,
            currentPeriodEnd: subData.current_period_end,
            cancelAtPeriodEnd: subData.cancel_at_period_end,
          });
        }
      } catch (error) {
        console.error("Error fetching billing data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleManageBilling = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error opening billing portal:", error);
      alert("Failed to open billing portal. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error starting checkout:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setActionLoading(false);
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

  const isPaid = subscription && subscription.status === "active";

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Subscription Plan
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">
                {isPaid ? "Pro Plan" : "Free Plan"}
              </div>
              <div className="text-neutral-400 text-sm mt-1">
                {isPaid
                  ? "Unlimited access to all features"
                  : "Limited usage - Upgrade for unlimited access"}
              </div>
            </div>
            {isPaid ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-neutral-500" />
            )}
          </div>

          {isPaid && subscription && (
            <div className="bg-neutral-700/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Status</span>
                <span className="text-green-400 font-medium">Active</span>
              </div>
              {subscription.currentPeriodEnd && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Renews on</span>
                  <span className="text-white">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
              )}
              {subscription.cancelAtPeriodEnd && (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    Your subscription will cancel at the end of the billing period.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {isPaid ? (
            <button
              onClick={handleManageBilling}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-semibold flex items-center gap-2"
            >
              {actionLoading ? (
                "Loading..."
              ) : (
                <>
                  Manage Billing
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              {actionLoading ? "Loading..." : "Upgrade to Pro"}
            </button>
          )}
        </div>
      </div>

      {/* Plan Features */}
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Plan Features</h3>

        <div className="space-y-3">
          {isPaid ? (
            <>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Unlimited API Usage</div>
                  <div className="text-neutral-400 text-sm">
                    No limits on derivatives data, economic data, or housing analytics
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Priority Support</div>
                  <div className="text-neutral-400 text-sm">
                    Get help faster with priority email and chat support
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Advanced Features</div>
                  <div className="text-neutral-400 text-sm">
                    Access to advanced screeners, backtesting, and AI analysis
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Save Unlimited Sessions</div>
                  <div className="text-neutral-400 text-sm">
                    Never lose your work with unlimited workspace saves
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">
                    10 requests per product per day
                  </div>
                  <div className="text-neutral-400 text-sm">
                    Limited API usage across all products
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-neutral-300 font-medium">Basic Support</div>
                  <div className="text-neutral-400 text-sm">
                    Community support only
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-neutral-300 font-medium">
                    Limited Advanced Features
                  </div>
                  <div className="text-neutral-400 text-sm">
                    Upgrade for advanced screeners and AI
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Billing Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-2">
          Secure Billing via Stripe
        </h3>
        <p className="text-neutral-300 text-sm">
          All payments are processed securely through Stripe. We never store your
          payment information on our servers. Click "Manage Billing" to update your
          payment method, view invoices, or cancel your subscription.
        </p>
      </div>
    </div>
  );
}
