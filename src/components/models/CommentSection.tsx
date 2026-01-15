// src/components/models/CommentSection.tsx
'use client';

import { useState, useEffect } from 'react';
import type { ModelComment } from '@/types/social';

interface CommentSectionProps {
  modelId: string;
}

export default function CommentSection({ modelId }: CommentSectionProps) {
  const [comments, setComments] = useState<ModelComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [modelId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/models/${modelId}/comments`);
      if (!response.ok) throw new Error('Failed to load comments');

      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Fetch comments error:', err);
      setError('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/models/${modelId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      setNewComment('');
      await fetchComments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/models/${modelId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      await fetchComments();
    } catch (err) {
      console.error('Delete comment error:', err);
      setError('Failed to delete comment');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Discussion ({comments.length})
      </h2>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts, questions, or feedback about this model..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />

        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}

        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-600">No comments yet</p>
          <p className="text-sm text-gray-500 mt-1">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {comment.user?.avatar_url ? (
                    <img
                      src={comment.user.avatar_url}
                      alt={comment.user.display_name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {comment.user?.display_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">
                      {comment.user?.display_name || 'Unknown User'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {comment.edited_at && (
                      <span className="text-sm text-gray-500">(edited)</span>
                    )}
                  </div>

                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {comment.content}
                  </p>

                  {/* Comment Actions */}
                  <div className="flex items-center gap-4 mt-3">
                    <button className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                      Reply
                    </button>
                    {comment.like_count !== undefined && comment.like_count > 0 && (
                      <span className="text-sm text-gray-600">
                        {comment.like_count} {comment.like_count === 1 ? 'like' : 'likes'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
