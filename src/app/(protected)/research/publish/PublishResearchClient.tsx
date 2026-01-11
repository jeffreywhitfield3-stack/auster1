"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { PublishingDraft, ResearchObjectType } from "@/types/research";

// Publishing flow: Transform lab work into public research objects

export default function PublishResearchClient() {
  const [step, setStep] = useState<"type" | "content" | "methods" | "review">("type");
  const [draft, setDraft] = useState<Partial<PublishingDraft>>({
    title: "",
    abstract: "",
    object_type: undefined,
    methods: "",
    assumptions: "",
    data_sources: [],
    statistical_techniques: [],
    tags: [],
    topics: [],
    lab_type: "none",
    content: { sections: [], findings: [] },
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <Link
            href="/research"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
          >
            ← Back to Research Stage
          </Link>
          <h1 className="mb-2 text-4xl font-bold text-zinc-900">Publish Research</h1>
          <p className="text-lg text-zinc-600">
            Transform your analytical work into a permanent public artifact
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center gap-2">
            {[
              { id: "type", label: "Type" },
              { id: "content", label: "Content" },
              { id: "methods", label: "Methods" },
              { id: "review", label: "Review" },
            ].map((s, idx) => (
              <React.Fragment key={s.id}>
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                    step === s.id
                      ? "bg-blue-100 text-blue-900"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  <span className="font-bold">{idx + 1}</span>
                  <span>{s.label}</span>
                </div>
                {idx < 3 && <div className="h-0.5 w-4 bg-zinc-200"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        {step === "type" && <TypeStep draft={draft} setDraft={setDraft} onNext={() => setStep("content")} />}
        {step === "content" && <ContentStep draft={draft} setDraft={setDraft} onNext={() => setStep("methods")} onBack={() => setStep("type")} />}
        {step === "methods" && <MethodsStep draft={draft} setDraft={setDraft} onNext={() => setStep("review")} onBack={() => setStep("content")} />}
        {step === "review" && <ReviewStep draft={draft} onBack={() => setStep("methods")} />}
      </div>

      {/* Guidelines Panel */}
      <div className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-900">
            Publishing Guidelines
          </h3>
          <div className="space-y-2 text-sm text-zinc-600">
            <p>✅ Make methods transparent and reproducible</p>
            <p>✅ State assumptions explicitly</p>
            <p>✅ Provide clear data sources</p>
            <p>✅ Write for inquiry, not advocacy</p>
            <p>✅ Invite substantive discussion</p>
          </div>
        </div>
      </div>
    </main>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepProps {
  draft: Partial<PublishingDraft>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<PublishingDraft>>>;
  onNext: () => void;
  onBack?: () => void;
}

function TypeStep({ draft, setDraft, onNext }: Omit<StepProps, "onBack">) {
  const types: Array<{
    value: ResearchObjectType;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      value: "economic_research",
      label: "Economic Research",
      description: "Long-run trends, inequality, structural analysis",
      icon: "🏛",
    },
    {
      value: "econometric_analysis",
      label: "Econometric Analysis",
      description: "Hypothesis tests, regressions, causal inference",
      icon: "📈",
    },
    {
      value: "market_analysis",
      label: "Market Analysis",
      description: "Options, derivatives, volatility studies",
      icon: "📊",
    },
    {
      value: "data_exploration",
      label: "Data Exploration",
      description: "Visualizations, distributions, patterns",
      icon: "🔍",
    },
    {
      value: "methodology",
      label: "Methodology",
      description: "New analytical techniques and approaches",
      icon: "🧮",
    },
    {
      value: "replication",
      label: "Replication Study",
      description: "Verify or challenge existing findings",
      icon: "🔬",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Choose Research Type</h2>
        <p className="text-zinc-600">Select the category that best describes your work</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {types.map((type) => (
          <button
            key={type.value}
            onClick={() => setDraft({ ...draft, object_type: type.value })}
            className={`rounded-xl border-2 p-6 text-left transition-all ${
              draft.object_type === type.value
                ? "border-blue-600 bg-blue-50"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <div className="mb-2 flex items-center gap-3">
              <span className="text-2xl">{type.icon}</span>
              <h3 className="text-lg font-bold text-zinc-900">{type.label}</h3>
            </div>
            <p className="text-sm text-zinc-600">{type.description}</p>
          </button>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!draft.object_type}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
        >
          Continue to Content →
        </button>
      </div>
    </div>
  );
}

function ContentStep({ draft, setDraft, onNext, onBack }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Research Content</h2>
        <p className="text-zinc-600">Provide the core content of your analysis</p>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-900">
            Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="e.g., Long-Run Inequality Trends in the United States, 1980-2025"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        {/* Abstract */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-900">
            Abstract <span className="text-red-600">*</span>
          </label>
          <textarea
            value={draft.abstract}
            onChange={(e) => setDraft({ ...draft, abstract: e.target.value })}
            placeholder="2-4 sentences summarizing your research question, approach, and key findings..."
            rows={4}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        {/* Topics */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-900">
            Topics <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Inequality, Income Distribution, Wealth (comma-separated)"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
          <p className="mt-1 text-xs text-zinc-500">Add 2-5 topics that describe your research</p>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="rounded-lg border-2 border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-900 transition-all hover:border-zinc-400"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!draft.title || !draft.abstract}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
        >
          Continue to Methods →
        </button>
      </div>
    </div>
  );
}

function MethodsStep({ draft, setDraft, onNext, onBack }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Methods & Reproducibility</h2>
        <p className="text-zinc-600">Make your analysis transparent and replicable</p>
      </div>

      <div className="space-y-4">
        {/* Methods */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-900">
            Methodology <span className="text-red-600">*</span>
          </label>
          <textarea
            value={draft.methods}
            onChange={(e) => setDraft({ ...draft, methods: e.target.value })}
            placeholder="Describe your analytical approach, statistical techniques, and calculations..."
            rows={6}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        {/* Assumptions */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-900">
            Key Assumptions <span className="text-red-600">*</span>
          </label>
          <textarea
            value={draft.assumptions}
            onChange={(e) => setDraft({ ...draft, assumptions: e.target.value })}
            placeholder="State explicit assumptions underlying your analysis..."
            rows={4}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        {/* Data Sources */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-900">
            Data Sources <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., BLS CPS, FRED, World Inequality Database (comma-separated)"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="rounded-lg border-2 border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-900 transition-all hover:border-zinc-400"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!draft.methods || !draft.assumptions}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
        >
          Continue to Review →
        </button>
      </div>
    </div>
  );
}

function ReviewStep({ draft, onBack }: Pick<StepProps, "draft" | "onBack">) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Review & Publish</h2>
        <p className="text-zinc-600">Verify your research object before publishing</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="mb-4 border-b border-zinc-200 pb-4">
          <div className="mb-2 text-sm font-semibold text-zinc-500">TYPE</div>
          <div className="text-lg font-bold text-zinc-900">{draft.object_type}</div>
        </div>

        <div className="mb-4 border-b border-zinc-200 pb-4">
          <div className="mb-2 text-sm font-semibold text-zinc-500">TITLE</div>
          <div className="text-lg font-bold text-zinc-900">{draft.title || "Untitled"}</div>
        </div>

        <div className="mb-4 border-b border-zinc-200 pb-4">
          <div className="mb-2 text-sm font-semibold text-zinc-500">ABSTRACT</div>
          <div className="text-sm leading-relaxed text-zinc-700">{draft.abstract || "No abstract provided"}</div>
        </div>

        <div className="mb-4 border-b border-zinc-200 pb-4">
          <div className="mb-2 text-sm font-semibold text-zinc-500">METHODS</div>
          <div className="text-sm leading-relaxed text-zinc-700">{draft.methods || "No methods provided"}</div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-zinc-500">ASSUMPTIONS</div>
          <div className="text-sm leading-relaxed text-zinc-700">{draft.assumptions || "No assumptions stated"}</div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <div className="mb-3 flex items-start gap-3">
          <div className="text-2xl">📢</div>
          <div>
            <h3 className="mb-1 text-sm font-bold text-blue-900">Attribution & Referral</h3>
            <p className="text-sm text-blue-800">
              This research object will include your personal referral link. Sharing and
              attribution will earn you credibility and unlock expanded platform access.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="rounded-lg border-2 border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-900 transition-all hover:border-zinc-400"
        >
          ← Back to Edit
        </button>
        <button className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white shadow-sm transition-all hover:bg-blue-700">
          Publish to Research Stage →
        </button>
      </div>
    </div>
  );
}
