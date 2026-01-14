// src/app/(protected)/settings/referrals/ReferralDashboardClient.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ReferralStats {
  total_referrals: number;
  total_conversions: number;
  conversion_rate: number;
  attribution_points: number;
  by_source_type: Record<string, { count: number; conversions: number }>;
  by_conversion_type: Record<string, number>;
}

interface Referral {
  code: string;
  source_type: string;
  conversions_count: number;
  created_at: string;
}

const sourceTypeLabels: Record<string, string> = {
  research: 'Research',
  profile: 'Profile',
  discussion: 'Discussion',
  collection: 'Collection',
};

const conversionTypeLabels: Record<string, string> = {
  signup: 'Signups',
  research_publish: 'Research Published',
  follow: 'Follows',
  discussion: 'Discussions',
};

export default function ReferralDashboardClient() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [topReferrals, setTopReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/research/referrals/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setTopReferrals(data.top_referrals || []);
      }
    } catch (error) {
      console.error('Failed to fetch referral stats:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="text-zinc-600">Loading referral stats...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-zinc-50 py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="text-red-600">Failed to load referral statistics</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-600">
            <Link href="/settings" className="hover:text-blue-600">
              Settings
            </Link>
            <span>/</span>
            <span className="text-zinc-900">Referrals</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900">Referral Dashboard</h1>
          <p className="mt-2 text-zinc-600">
            Track your referrals and earn attribution points
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Key Stats */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <div className="mb-2 text-sm font-medium text-zinc-600">Total Referrals</div>
            <div className="text-3xl font-bold text-zinc-900">{stats.total_referrals}</div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <div className="mb-2 text-sm font-medium text-zinc-600">Conversions</div>
            <div className="text-3xl font-bold text-zinc-900">{stats.total_conversions}</div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <div className="mb-2 text-sm font-medium text-zinc-600">Conversion Rate</div>
            <div className="text-3xl font-bold text-zinc-900">{stats.conversion_rate}%</div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <div className="mb-2 text-sm font-medium text-zinc-600">Attribution Points</div>
            <div className="text-3xl font-bold text-blue-600">{stats.attribution_points}</div>
          </div>
        </div>

        {/* By Source Type */}
        <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Referrals by Source</h2>
          <div className="space-y-4">
            {Object.entries(stats.by_source_type).map(([type, data]) => (
              <div key={type}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-900">{sourceTypeLabels[type]}</span>
                  <span className="text-zinc-600">
                    {data.count} referrals · {data.conversions} conversions
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full bg-blue-600"
                    style={{
                      width: stats.total_referrals > 0
                        ? `${(data.count / stats.total_referrals) * 100}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Conversion Type */}
        <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Conversions by Type</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(stats.by_conversion_type).map(([type, count]) => (
              <div key={type} className="rounded-lg border border-zinc-200 p-4">
                <div className="mb-1 text-sm text-zinc-600">{conversionTypeLabels[type]}</div>
                <div className="text-2xl font-bold text-zinc-900">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Referrals */}
        {topReferrals.length > 0 && (
          <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Top Performing Referrals</h2>
            <div className="space-y-3">
              {topReferrals.map((referral) => (
                <div
                  key={referral.code}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 p-4"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-900">
                      {sourceTypeLabels[referral.source_type]} Referral
                    </div>
                    <div className="text-xs text-zinc-600">
                      Code: {referral.code} · Created {new Date(referral.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{referral.conversions_count}</div>
                    <div className="text-xs text-zinc-600">conversions</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">How Referrals Work</h2>
          <div className="space-y-3 text-sm text-zinc-700">
            <p>
              <strong>Share research, collections, or your profile</strong> using the Share button to generate a unique referral link.
            </p>
            <p>
              <strong>Earn attribution points</strong> when people you refer take actions:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Sign up: 10 points</li>
              <li>Publish research: 25 points</li>
              <li>Follow someone: 5 points</li>
              <li>Start a discussion: 5 points</li>
            </ul>
            <p>
              <strong>Attribution points</strong> contribute to your researcher tier and visibility on the platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
