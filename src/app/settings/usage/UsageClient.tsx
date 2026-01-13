"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { BarChart3, TrendingUp, Activity, AlertCircle } from "lucide-react";

type UsageData = {
  product: string;
  usedProduct: number;
  limitProduct: number;
  usedTotal: number;
  limitTotal: number;
};

export default function UsageClient() {
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string>("free");

  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch usage data
        const { data: usageData, error } = await supabase
          .from("user_usage")
          .select("*")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching usage:", error);
        } else if (usageData) {
          setUsage(usageData);
        }

        // Check if user has active subscription
        const { data: subscription } = await supabase
          .from("stripe_subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();

        if (subscription) {
          setTier("pro");
        } else {
          // Check entitlements table as fallback
          const { data: entitlement } = await supabase
            .from("user_entitlements")
            .select("tier")
            .eq("user_id", user.id)
            .single();

          if (entitlement) {
            setTier(entitlement.tier);
          }
        }
      } catch (error) {
        console.error("Error loading usage data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  const getProductName = (product: string) => {
    const names: Record<string, string> = {
      derivatives: "Derivatives Lab",
      housing: "Housing Analytics",
      econ: "Economics Lab",
      portfolio: "Portfolio Analyzer",
      valuation: "Valuation Tools",
    };
    return names[product] || product;
  };

  const getProductIcon = (product: string) => {
    const icons: Record<string, React.ReactNode> = {
      derivatives: <TrendingUp className="w-5 h-5" />,
      housing: <Activity className="w-5 h-5" />,
      econ: <BarChart3 className="w-5 h-5" />,
      portfolio: <TrendingUp className="w-5 h-5" />,
      valuation: <Activity className="w-5 h-5" />,
    };
    return icons[product] || <Activity className="w-5 h-5" />;
  };

  const calculatePercentage = (used: number, limit: number) => {
    if (tier === "pro" || tier === "paid") return 0; // Unlimited
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
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

  const isPro = tier === "pro" || tier === "paid";
  const totalUsed = usage.reduce((sum, u) => sum + u.usedProduct, 0);
  const totalLimit = usage.length > 0 ? usage[0].limitTotal : 50;

  return (
    <div className="space-y-6">
      {/* Usage Summary */}
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          API Usage
        </h2>

        {isPro ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Activity className="w-6 h-6 text-green-500 mt-0.5" />
              <div>
                <div className="text-green-400 font-semibold text-lg">
                  Unlimited Usage
                </div>
                <div className="text-neutral-300 text-sm mt-1">
                  You have unlimited access to all APIs and features with your Pro
                  plan.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">
                  {totalUsed} / {totalLimit}
                </div>
                <div className="text-neutral-400 text-sm">
                  Total requests today (across all products)
                </div>
              </div>
              {totalUsed >= totalLimit && (
                <AlertCircle className="w-8 h-8 text-red-500" />
              )}
            </div>

            <div className="relative">
              <div className="h-4 bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getProgressColor(
                    calculatePercentage(totalUsed, totalLimit)
                  )}`}
                  style={{
                    width: `${calculatePercentage(totalUsed, totalLimit)}%`,
                  }}
                ></div>
              </div>
            </div>

            {totalUsed >= totalLimit * 0.9 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <div className="text-yellow-400 font-semibold">
                      Approaching Limit
                    </div>
                    <div className="text-neutral-300 text-sm mt-1">
                      You're running low on API requests. Upgrade to Pro for
                      unlimited access.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Per-Product Usage */}
      {!isPro && usage.length > 0 && (
        <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Usage by Product
          </h3>

          <div className="space-y-4">
            {usage.map((item) => {
              const percentage = calculatePercentage(
                item.usedProduct,
                item.limitProduct
              );

              return (
                <div key={item.product} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-blue-400">
                        {getProductIcon(item.product)}
                      </div>
                      <span className="text-white font-medium">
                        {getProductName(item.product)}
                      </span>
                    </div>
                    <span className="text-neutral-400 text-sm">
                      {item.usedProduct} / {item.limitProduct}
                    </span>
                  </div>

                  <div className="relative">
                    <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getProgressColor(
                          percentage
                        )}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {!isPro && (
        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-2">
            Upgrade to Pro for Unlimited Access
          </h3>
          <p className="text-neutral-300 text-sm mb-4">
            Never worry about usage limits again. Get unlimited access to all
            APIs, advanced features, and priority support.
          </p>
          <a
            href="/settings/billing"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
          >
            View Plans
          </a>
        </div>
      )}

      {/* How Usage Works */}
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-3">How Usage Works</h3>
        <div className="space-y-2 text-sm text-neutral-300">
          <p>• Free tier: 10 requests per product per day, 50 total per day</p>
          <p>• Usage resets daily at midnight UTC</p>
          <p>• Each API call counts as 1 request</p>
          <p>• Pro plan: Unlimited requests across all products</p>
        </div>
      </div>
    </div>
  );
}
