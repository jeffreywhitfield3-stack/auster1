// src/app/(protected)/settings/referrals/page.tsx
import { Metadata } from 'next';
import ReferralDashboardClient from './ReferralDashboardClient';

export const metadata: Metadata = {
  title: 'Referral Dashboard',
  description: 'Track your referrals and attribution points',
};

export default function ReferralDashboardPage() {
  return <ReferralDashboardClient />;
}
