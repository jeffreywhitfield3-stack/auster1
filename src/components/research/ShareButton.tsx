// src/components/research/ShareButton.tsx
'use client';

import { useState } from 'react';

interface ShareButtonProps {
  sourceType: 'research' | 'profile' | 'discussion' | 'collection';
  sourceId?: string;
  title?: string;
  compact?: boolean;
}

export default function ShareButton({ sourceType, sourceId, title, compact = false }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateReferralLink() {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/research/referrals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: sourceType,
          source_id: sourceId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReferralCode(data.referral.code);
        setReferralUrl(data.referral.url);
      }
    } catch (error) {
      console.error('Failed to generate referral link:', error);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyLink() {
    if (referralUrl) {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleShare(platform: string) {
    if (!referralUrl) return;

    const text = title || 'Check this out';
    const encodedUrl = encodeURIComponent(referralUrl);
    const encodedText = encodeURIComponent(text);

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodedText}&body=${encodedText}%20${encodedUrl}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  }

  async function handleOpen() {
    setIsOpen(true);
    if (!referralCode) {
      await generateReferralLink();
    }
  }

  if (compact) {
    return (
      <>
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-blue-600"
          title="Share"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Share
        </button>

        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
            <ShareDialog
              isGenerating={isGenerating}
              referralUrl={referralUrl}
              copied={copied}
              onCopy={handleCopyLink}
              onShare={handleShare}
              onClose={() => setIsOpen(false)}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
          <ShareDialog
            isGenerating={isGenerating}
            referralUrl={referralUrl}
            copied={copied}
            onCopy={handleCopyLink}
            onShare={handleShare}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}

function ShareDialog({
  isGenerating,
  referralUrl,
  copied,
  onCopy,
  onShare,
  onClose,
}: {
  isGenerating: boolean;
  referralUrl: string | null;
  copied: boolean;
  onCopy: () => void;
  onShare: (platform: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-900">Share</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Share and earn attribution points when others engage
        </p>
      </div>

      {isGenerating ? (
        <div className="py-8 text-center">
          <div className="text-zinc-600">Generating your referral link...</div>
        </div>
      ) : referralUrl ? (
        <>
          {/* Referral Link */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-zinc-900">
              Your referral link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={onCopy}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-zinc-900">
              Share on
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => onShare('twitter')}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                  Twitter
                </div>
              </button>
              <button
                onClick={() => onShare('linkedin')}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </div>
              </button>
              <button
                onClick={() => onShare('email')}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Email
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Close
          </button>
        </>
      ) : (
        <div className="py-8 text-center text-sm text-red-600">
          Failed to generate referral link
        </div>
      )}
    </div>
  );
}
