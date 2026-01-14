"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Discussion {
  id: string;
  content: string;
  discussion_type: string;
  thread_depth: number;
  parent_id: string | null;
  created_at: string;
  author: {
    id: string;
    display_name: string;
    slug: string;
    avatar_url: string | null;
    tier: string;
  };
}

interface ResearchViewClientProps {
  researchId: string;
  researchSlug: string;
  currentUserProfile: { id: string; tier: string } | null;
}

export default function ResearchViewClient({
  researchId,
  researchSlug,
  currentUserProfile,
}: ResearchViewClientProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [newDiscussionContent, setNewDiscussionContent] = useState("");
  const [newDiscussionType, setNewDiscussionType] = useState("question");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDiscussions();
  }, [researchSlug]);

  async function fetchDiscussions() {
    try {
      const response = await fetch(`/api/research/${researchSlug}/discussions`);
      const data = await response.json();
      setDiscussions(data.discussions || []);
    } catch (error) {
      console.error("Failed to fetch discussions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitDiscussion() {
    if (!newDiscussionContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/research/${researchSlug}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newDiscussionContent,
          discussion_type: newDiscussionType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDiscussions([...discussions, data.discussion]);
        setNewDiscussionContent("");
        setShowNewDiscussion(false);
      }
    } catch (error) {
      console.error("Failed to submit discussion:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReply(parentId: string) {
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/research/${researchSlug}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent,
          discussion_type: "comment",
          parent_id: parentId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDiscussions([...discussions, data.discussion]);
        setReplyContent("");
        setReplyingTo(null);
      }
    } catch (error) {
      console.error("Failed to submit reply:", error);
    } finally {
      setSubmitting(false);
    }
  }

  const canStartDiscussion =
    currentUserProfile && currentUserProfile.tier !== "observer";

  const discussionTypes = [
    { value: "question", label: "❓ Question", color: "text-blue-600" },
    { value: "insight", label: "💡 Insight", color: "text-yellow-600" },
    { value: "critique", label: "🔍 Critique", color: "text-red-600" },
    { value: "extension", label: "🚀 Extension", color: "text-green-600" },
    { value: "replication", label: "🔄 Replication", color: "text-purple-600" },
    { value: "clarification", label: "❔ Clarification", color: "text-orange-600" },
    { value: "comment", label: "💬 Comment", color: "text-zinc-600" },
  ];

  // Organize discussions into threads
  const topLevelDiscussions = discussions.filter((d) => !d.parent_id);
  const getReplies = (parentId: string) =>
    discussions.filter((d) => d.parent_id === parentId);

  function DiscussionItem({ discussion }: { discussion: Discussion }) {
    const replies = getReplies(discussion.id);
    const typeInfo = discussionTypes.find(
      (t) => t.value === discussion.discussion_type
    );

    return (
      <div
        className="border-l-2 border-zinc-200 pl-4"
        style={{ marginLeft: `${discussion.thread_depth * 20}px` }}
      >
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          {/* Author info */}
          <div className="mb-3 flex items-center gap-3">
            <Link
              href={`/researchers/${discussion.author.slug}`}
              className="flex items-center gap-2 hover:underline"
            >
              {discussion.author.avatar_url ? (
                <img
                  src={discussion.author.avatar_url}
                  alt={discussion.author.display_name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {discussion.author.display_name[0].toUpperCase()}
                </div>
              )}
              <span className="font-medium text-zinc-900">
                {discussion.author.display_name}
              </span>
            </Link>
            <span className="text-xs text-zinc-400 capitalize">
              {discussion.author.tier}
            </span>
            <span className="text-xs text-zinc-400">·</span>
            <span className="text-xs text-zinc-400">
              {new Date(discussion.created_at).toLocaleDateString()}
            </span>
            {typeInfo && (
              <>
                <span className="text-xs text-zinc-400">·</span>
                <span className={`text-xs font-medium ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
              </>
            )}
          </div>

          {/* Content */}
          <p className="mb-3 whitespace-pre-wrap text-zinc-700">
            {discussion.content}
          </p>

          {/* Reply button */}
          {canStartDiscussion && discussion.thread_depth < 5 && (
            <button
              onClick={() => setReplyingTo(discussion.id)}
              className="text-sm text-blue-600 hover:underline"
            >
              Reply
            </button>
          )}

          {/* Reply form */}
          {replyingTo === discussion.id && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                className="mb-2 w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSubmitReply(discussion.id)}
                  disabled={submitting || !replyContent.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-zinc-300"
                >
                  {submitting ? "Posting..." : "Post Reply"}
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent("");
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Render replies */}
        {replies.length > 0 && (
          <div className="mt-4 space-y-4">
            {replies.map((reply) => (
              <DiscussionItem key={reply.id} discussion={reply} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900">
          Discussions ({discussions.length})
        </h2>
        {canStartDiscussion && !showNewDiscussion && (
          <button
            onClick={() => setShowNewDiscussion(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Start Discussion
          </button>
        )}
        {!canStartDiscussion && (
          <p className="text-sm text-zinc-500">
            <Link href="/support" className="text-blue-600 hover:underline">
              Upgrade to Contributor
            </Link>{" "}
            to start discussions
          </p>
        )}
      </div>

      {/* New Discussion Form */}
      {showNewDiscussion && (
        <div className="mb-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900">
            Start a New Discussion
          </h3>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Discussion Type
            </label>
            <div className="flex flex-wrap gap-2">
              {discussionTypes
                .filter((t) => t.value !== "comment")
                .map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setNewDiscussionType(type.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      newDiscussionType === type.value
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
            </div>
          </div>

          <textarea
            value={newDiscussionContent}
            onChange={(e) => setNewDiscussionContent(e.target.value)}
            placeholder="Share your thoughts, questions, or insights..."
            className="mb-4 w-full rounded-lg border border-zinc-300 p-4 focus:border-blue-500 focus:outline-none"
            rows={6}
          />

          <div className="flex gap-2">
            <button
              onClick={handleSubmitDiscussion}
              disabled={submitting || !newDiscussionContent.trim()}
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-zinc-300"
            >
              {submitting ? "Posting..." : "Post Discussion"}
            </button>
            <button
              onClick={() => {
                setShowNewDiscussion(false);
                setNewDiscussionContent("");
              }}
              className="rounded-lg border border-zinc-300 bg-white px-6 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Discussions List */}
      {loading ? (
        <p className="text-center text-zinc-500">Loading discussions...</p>
      ) : discussions.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center">
          <p className="text-zinc-600">
            No discussions yet. Be the first to start one!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {topLevelDiscussions.map((discussion) => (
            <DiscussionItem key={discussion.id} discussion={discussion} />
          ))}
        </div>
      )}
    </div>
  );
}
