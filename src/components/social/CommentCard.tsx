// src/components/social/CommentCard.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ModelComment } from '@/types/social';
import { formatDistanceToNow } from 'date-fns';

interface CommentCardProps {
  comment: ModelComment;
  modelSlug: string;
  isAuthenticated: boolean;
  onDelete: (commentId: string) => void;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
  isReply?: boolean;
}

export default function CommentCard({
  comment,
  modelSlug,
  isAuthenticated,
  onDelete,
  onReply,
  isReply = false,
}: CommentCardProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(comment.user_has_liked || false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        const response = await fetch(
          `/api/models/${modelSlug}/comments/${comment.id}/like`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          setIsLiked(false);
          setLikeCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        // Like
        const response = await fetch(
          `/api/models/${modelSlug}/comments/${comment.id}/like`,
          { method: 'POST' }
        );

        if (response.ok) {
          setIsLiked(true);
          setLikeCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim()) return;

    setIsSubmittingReply(true);

    try {
      await onReply(comment.id, replyContent);
      setReplyContent('');
      setShowReplyForm(false);
    } catch (error) {
      alert('Failed to post reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
  });

  return (
    <div className={`p-6 ${isReply ? 'pl-16 bg-gray-50' : ''}`}>
      <div className="flex gap-4">
        {/* Avatar */}
        <Link
          href={`/@${comment.user?.username}`}
          className="flex-shrink-0"
        >
          {comment.user?.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt={comment.user.display_name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium text-sm">
                {comment.user?.display_name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/@${comment.user?.username}`}
              className="font-medium text-gray-900 hover:text-blue-600"
            >
              {comment.user?.display_name}
            </Link>

            <span className="text-gray-400">·</span>

            <span className="text-sm text-gray-500">
              {timeAgo}
            </span>

            {comment.edited_at && (
              <>
                <span className="text-gray-400">·</span>
                <span className="text-sm text-gray-500 italic">
                  edited
                </span>
              </>
            )}
          </div>

          {/* Comment Text */}
          <p className="mt-2 text-gray-700 whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-4">
            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isLiked
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <svg
                className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`}
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {/* Reply Button (only for top-level comments) */}
            {!isReply && (
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    router.push('/login');
                    return;
                  }
                  setShowReplyForm(!showReplyForm);
                }}
                className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
              >
                Reply
              </button>
            )}

            {/* Delete Button (if own comment) */}
            <button
              onClick={() => onDelete(comment.id)}
              className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
            >
              Delete
            </button>
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <form onSubmit={handleSubmitReply} className="mt-4">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={2000}
              />

              <div className="mt-2 flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowReplyForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!replyContent.trim() || isSubmittingReply}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingReply ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </form>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  modelSlug={modelSlug}
                  isAuthenticated={isAuthenticated}
                  onDelete={onDelete}
                  onReply={onReply}
                  isReply={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
