import { Metadata } from 'next';
import OnboardingClient from './OnboardingClient';

export const metadata: Metadata = {
  title: 'Complete Your Profile',
  description: 'Tell us about yourself to personalize your experience',
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
