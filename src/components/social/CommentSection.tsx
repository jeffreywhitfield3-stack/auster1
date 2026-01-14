// src/components/social/CommentSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ModelComment } from '@/types/social';
import CommentCard from './CommentCard';

interface CommentSectionProps {
  modelSlug: string;
  isAuthenticated: boolean;
}

export default function CommentSection({
  modelSlug,
  isAuthenticated,
}: CommentSectionProps) {
  const router = useRouter();
  const [comments, setComments] = useState<ModelComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [modelSlug]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/models/${modelSlug}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');

      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Fetch comments error:', err);
      setError('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/models/${modelSlug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (!response.ok) {
        throw new Error('Failed to post comment');
      }

      setNewComment('');
      await fetchComments();
      router.refresh();
    } catch (err) {
      console.error('Submit comment error:', err);
      setError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(
        `/api/models/${modelSlug}/comments/${commentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete comment');

      await fetchComments();
      router.refresh();
    } catch (err) {
      console.error('Delete comment error:', err);
      alert('Failed to delete comment');
    }
  };

  const handleReply = async (parentCommentId: string, content: string) => {
    try {
      const response = await fetch(`/api/models/${modelSlug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parent_comment_id: parentCommentId }),
      });

      if (!response.ok) throw new Error('Failed to post reply');

      await fetchComments();
      router.refresh();
    } catch (err) {
      console.error('Submit reply error:', err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h2>
      </div>

      {/* Comment Form */}
      <div className="p-6 border-b border-gray-200">
        <form onSubmit={handleSubmitComment}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              isAuthenticated
                ? 'Share your thoughts...'
                : 'Sign in to leave a comment'
            }
            disabled={!isAuthenticated || isSubmitting}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500"
            rows={3}
            maxLength={2000}
          />

          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {newComment.length}/2000
            </span>

            {isAuthenticated ? (
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In to Comment
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="divide-y divide-gray-200">
        {comments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-1">
              No comments yet
            </p>
            <p className="text-gray-600">
              Be the first to share your thoughts on this model
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              modelSlug={modelSlug}
              isAuthenticated={isAuthenticated}
              onDelete={handleDeleteComment}
              onReply={handleReply}
            />
          ))
        )}
      </div>
    </div>
  );
}
