// src/app/[username]/ProfilePageClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UserProfile } from '@/types/social';
import FollowButton from '@/components/social/FollowButton';

interface ProfilePageClientProps {
  username: string;
}

export default function ProfilePageClient({ username }: ProfilePageClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [research, setResearch] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'models' | 'research'>('models');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (profile) {
      if (activeTab === 'models') {
        fetchModels();
      } else {
        fetchResearch();
      }
    }
  }, [activeTab, profile]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profiles/${username}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Profile not found');
        } else if (response.status === 403) {
          setError('This profile is private');
        } else {
          setError('Failed to load profile');
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setProfile(data.profile);

      // Check if this is the current user's profile
      const meResponse = await fetch('/api/profiles/me');
      if (meResponse.ok) {
        const meData = await meResponse.json();
        setIsOwnProfile(meData.profile?.id === data.profile.id);
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch(`/api/profiles/${username}/models`);
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      }
    } catch (err) {
      console.error('Fetch models error:', err);
    }
  };

  const fetchResearch = async () => {
    try {
      const response = await fetch(`/api/profiles/${username}/research`);
      if (response.ok) {
        const data = await response.json();
        setResearch(data.research || []);
      }
    } catch (err) {
      console.error('Fetch research error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {error || 'Profile not found'}
        </h1>
        <p className="text-gray-600 mb-6">
          The profile you're looking for doesn't exist or is private
        </p>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Go to homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                <span className="text-3xl font-semibold text-gray-700">
                  {profile.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.display_name}
                </h1>
                <p className="text-base text-gray-600">@{profile.username}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {isOwnProfile ? (
                  <Link
                    href="/settings/profile"
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Edit Profile
                  </Link>
                ) : (
                  <FollowButton
                    userId={profile.id}
                    initialIsFollowing={profile.is_following || false}
                    size="md"
                  />
                )}
              </div>
            </div>

            {/* Affiliation */}
            {profile.affiliation && (
              <p className="text-sm text-gray-700 font-medium mb-3">
                {profile.affiliation}
              </p>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-gray-900 mb-4 whitespace-pre-wrap leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Meta Info */}
            {(profile.location || profile.website_url || profile.twitter_handle || profile.github_handle) && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-4">
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{profile.location}</span>
                  </div>
                )}

                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>{new URL(profile.website_url).hostname}</span>
                  </a>
                )}

                {profile.twitter_handle && (
                  <a
                    href={`https://twitter.com/${profile.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    <span>@{profile.twitter_handle}</span>
                  </a>
                )}

                {profile.github_handle && (
                  <a
                    href={`https://github.com/${profile.github_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                    </svg>
                    <span>{profile.github_handle}</span>
                  </a>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
              <div>
                <span className="font-semibold text-gray-900">{profile.follower_count || 0}</span>
                <span className="text-sm text-gray-600 ml-1">Followers</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">{profile.following_count || 0}</span>
                <span className="text-sm text-gray-600 ml-1">Following</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">{profile.model_count || 0}</span>
                <span className="text-sm text-gray-600 ml-1">Models</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">{profile.research_count || 0}</span>
                <span className="text-sm text-gray-600 ml-1">Research</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('models')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'models'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Models ({profile.model_count || 0})
          </button>
          <button
            onClick={() => setActiveTab('research')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'research'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Research ({profile.research_count || 0})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'models' && (
        <div>
          {models.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm text-gray-600">No models yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {models.map((model) => (
                <Link
                  key={model.id}
                  href={`/models/${model.slug}`}
                  className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {model.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {model.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{model.total_runs || 0} runs</span>
                    {model.avg_rating && (
                      <span>★ {model.avg_rating.toFixed(1)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'research' && (
        <div>
          {research.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-600">No research posts yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {research.map((post) => (
                <Link
                  key={post.id}
                  href={`/research/${post.slug}`}
                  className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {new Date(post.published_at).toLocaleDateString()}
                    </span>
                    {post.view_count && (
                      <span>{post.view_count} views</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
