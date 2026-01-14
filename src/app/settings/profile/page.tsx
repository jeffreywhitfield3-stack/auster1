// src/app/settings/profile/page.tsx
import { Metadata } from 'next';
import ProfileSettingsClient from './ProfileSettingsClient';

export const metadata: Metadata = {
  title: 'Profile Settings | Auster',
  description: 'Manage your public profile settings',
};

export default function ProfileSettingsPage() {
  return <ProfileSettingsClient />;
}
