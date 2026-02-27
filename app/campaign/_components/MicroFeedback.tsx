/**
 * MicroFeedback — lightweight "Was this helpful?" widget shown after FAQ content.
 *
 * Flow:
 *  1. Yes / No prompt
 *  2. If No → follow-up tag buttons asking what was unclear
 *  3. Thank-you confirmation
 *
 * Tracks events via the shared analytics helper so we can measure
 * content effectiveness without a heavy survey.
 */
'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import { analytics } from '@/app/_lib/analytics';

/** Possible reasons a user found the content unhelpful */
const UNCLEAR_OPTIONS = [
  'eTIMS explanation',
  'Filing process',
  'Contact reason',
  'Payment steps',
] as const;

type UnclearReason = (typeof UNCLEAR_OPTIONS)[number];

interface MicroFeedbackProps {
  /** Identifier for the page/section the feedback relates to */
  pageId: string;
}

/**
 * Renders a compact feedback widget at the bottom of content pages.
 * Designed for mobile — large tap targets, minimal text.
 */
export default function MicroFeedback({ pageId }: MicroFeedbackProps) {
  const [stage, setStage] = useState<'prompt' | 'followup' | 'done'>('prompt');
  const [selectedReason, setSelectedReason] = useState<UnclearReason | null>(null);

  /** User tapped "Yes" — record and finish */
  const handleYes = () => {
    analytics.track('micro_feedback', { pageId, helpful: true });
    setStage('done');
  };

  /** User tapped "No" — show follow-up tags */
  const handleNo = () => {
    analytics.track('micro_feedback', { pageId, helpful: false });
    setStage('followup');
  };

  /** User selected a reason for unhelpfulness */
  const handleReason = (reason: UnclearReason) => {
    setSelectedReason(reason);
    analytics.track('micro_feedback_reason', { pageId, reason });
    setStage('done');
  };

  /* ── Done state ────────────────────────────────────── */
  if (stage === 'done') {
    return (
      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 animate-in fade-in duration-300">
        <CheckCircle className="w-4 h-4 shrink-0" />
        Thank you for your feedback!
      </div>
    );
  }

  /* ── Follow-up: what was unclear? ──────────────────── */
  if (stage === 'followup') {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm font-medium text-gray-700 text-center">
          What was unclear?
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {UNCLEAR_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => handleReason(option)}
              className={`px-3.5 py-2 text-xs font-medium rounded-full border transition-colors ${
                selectedReason === option
                  ? 'bg-[var(--kra-red)] text-white border-[var(--kra-red)]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 active:bg-gray-100'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Initial prompt ────────────────────────────────── */
  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm font-medium text-gray-600 text-center">
        Was this information helpful?
      </p>
      <div className="flex justify-center gap-3">
        <button
          onClick={handleYes}
          className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-xl bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 active:bg-green-200 transition-colors"
        >
          <ThumbsUp className="w-4 h-4" />
          Yes
        </button>
        <button
          onClick={handleNo}
          className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 active:bg-red-200 transition-colors"
        >
          <ThumbsDown className="w-4 h-4" />
          No
        </button>
      </div>
    </div>
  );
}
