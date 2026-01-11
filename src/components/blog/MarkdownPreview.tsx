// src/components/blog/MarkdownPreview.tsx
"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownPreview({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-zinc max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...props} alt={props.alt || ""} className="rounded-xl border border-zinc-200" />
          ),
          a: ({ ...props }) => (
            <a {...props} className="text-zinc-900 underline underline-offset-4 hover:text-zinc-700" />
          ),
        }}
      >
        {markdown || ""}
      </ReactMarkdown>
    </div>
  );
}