/**
 * PostSurvey — 3-question post-interaction survey shown after filing or support.
 *
 * Questions:
 *  1. Was the reason for this notice clear?
 *  2. Did pre-population make filing easier?
 *  3. What should KRA improve?
 *  4. (Optional) Would you like a support officer to assist you?
 *
 * Each answer is tracked via analytics. The component is self-contained and
 * shows a thank-you card on completion.
 */
'use client';

import { useState } from 'react';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { analytics } from '@/app/_lib/analytics';

/** Options the user can pick for "What should KRA improve?" */
const IMPROVEMENT_OPTIONS = [
  'Login experience',
  'eTIMS clarity',
  'Payment process',
  'Communication clarity',
] as const;

type ImprovementOption = (typeof IMPROVEMENT_OPTIONS)[number];

interface PostSurveyProps {
  /** Phone number forwarded from query params for analytics identification */
  phone?: string;
}

/**
 * Renders a stepped survey with large tap-friendly buttons.
 * Designed for mobile — one question visible at a time.
 */
export default function PostSurvey({ phone }: PostSurveyProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  /** Record an answer and advance to the next step */
  const answer = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    analytics.track('campaign_survey_answer', { question: key, value, phone });
    setStep((s) => s + 1);
  };

  /** Skip the optional question */
  const skip = () => {
    setStep((s) => s + 1);
  };

  /* ── Thank-you state ───────────────────────────────── */
  if (step >= 4) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Thank you!</h2>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          Your responses help us improve KRA services for everyone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-[var(--kra-red)]' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* ── Q1: Was the reason clear? ──────────────────── */}
      {step === 0 && (
        <QuestionCard
          number={1}
          question="Was the reason for this notice clear?"
        >
          <YesNoButtons onSelect={(v) => answer('notice_clear', v)} />
        </QuestionCard>
      )}

      {/* ── Q2: Did pre-population help? ───────────────── */}
      {step === 1 && (
        <QuestionCard
          number={2}
          question="Did pre-population make filing easier?"
        >
          <div className="flex flex-col gap-2">
            {['Yes', 'No', "Didn't use it"].map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                onClick={() => answer('prepopulation_helpful', opt)}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {/* ── Q3: What should KRA improve? ───────────────── */}
      {step === 2 && (
        <QuestionCard number={3} question="What should KRA improve?">
          <div className="flex flex-col gap-2">
            {IMPROVEMENT_OPTIONS.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                onClick={() => answer('improvement_area', opt)}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {/* ── Q4 (optional): Support officer? ────────────── */}
      {step === 3 && (
        <QuestionCard
          number={4}
          question="Would you like a support officer to assist you?"
          optional
        >
          <YesNoButtons onSelect={(v) => answer('wants_support', v)} />
          <button
            onClick={skip}
            className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-2"
          >
            Skip
          </button>
        </QuestionCard>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────── */

/** Card wrapper that displays question number, text, and children */
function QuestionCard({
  number,
  question,
  optional,
  children,
}: {
  number: number;
  question: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4 animate-in slide-in-from-right-4 duration-200">
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Question {number} of 4
          {optional && (
            <span className="ml-1 text-gray-300">· Optional</span>
          )}
        </span>
        <h3 className="mt-1 text-base font-semibold text-gray-900">
          {question}
        </h3>
      </div>
      {children}
    </div>
  );
}

/** Simple Yes / No button pair */
function YesNoButtons({ onSelect }: { onSelect: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onSelect('Yes')}
        className="py-3 rounded-xl text-sm font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 active:bg-green-200 transition-colors"
      >
        Yes
      </button>
      <button
        onClick={() => onSelect('No')}
        className="py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 active:bg-red-200 transition-colors"
      >
        No
      </button>
    </div>
  );
}

/** Single-option selection button with a right chevron */
function OptionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors"
    >
      {label}
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  );
}
