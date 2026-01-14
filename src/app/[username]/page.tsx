// src/app/[username]/page.tsx
import { Metadata } from 'next';
import ProfilePageClient from './ProfilePageClient';

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `@${username} | Auster`,
    description: `View ${username}'s profile, models, and research on Auster`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  return <ProfilePageClient username={username} />;
}
