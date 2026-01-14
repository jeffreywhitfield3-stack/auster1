// src/components/social/FollowButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function FollowButton({
  userId,
  initialIsFollowing,
  size = 'md',
  className = '',
}: FollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const response = await fetch(`/api/follows/${userId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to unfollow');
        }

        setIsFollowing(false);
      } else {
        // Follow
        const response = await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ following_id: userId }),
        });

        if (!response.ok) {
          throw new Error('Failed to follow');
        }

        setIsFollowing(true);
      }

      router.refresh();
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const buttonText = isFollowing
    ? isHovered
      ? 'Unfollow'
      : 'Following'
    : 'Follow';

  const buttonClasses = isFollowing
    ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 border border-gray-300'
    : 'bg-blue-600 text-white hover:bg-blue-700 border border-transparent';

  return (
    <button
      onClick={handleFollow}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        ${buttonClasses}
        font-medium rounded-lg
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {buttonText}
        </span>
      ) : (
        buttonText
      )}
    </button>
  );
}
