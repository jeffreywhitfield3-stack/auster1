"use client";

import React, { useState } from "react";

interface ResearcherProfileClientProps {
  researcherId: string;
  initialFollowing: boolean;
}

export default function ResearcherProfileClient({
  researcherId,
  initialFollowing,
}: ResearcherProfileClientProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function handleFollowToggle() {
    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const response = await fetch('/api/research/follow', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ researcher_id: researcherId }),
        });

        if (response.ok) {
          setIsFollowing(false);
        }
      } else {
        // Follow
        const response = await fetch('/api/research/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            researcher_id: researcherId,
            notify_on_publish: true,
            notify_on_discussion: false,
          }),
        });

        if (response.ok) {
          setIsFollowing(true);
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      alert('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={loading}
      className={`rounded-lg px-6 py-2 font-medium ${
        isFollowing
          ? 'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } disabled:opacity-50`}
    >
      {loading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
