/**
 * "How Pre-Population Works" content page.
 *
 * Explains the eTIMS pre-populated filing flow: real-time invoices,
 * auto-populated ledger, review-and-submit, and the 2026 eTIMS-only rule.
 * Includes a MicroFeedback widget at the bottom.
 */
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layout, Card } from '@/app/_components/Layout';
import MicroFeedback from '@/app/campaign/_components/MicroFeedback';
import { Zap, BookOpen, ClipboardCheck, Send, Calendar, Gauge } from 'lucide-react';

/** Steps describing how pre-populated filing works */
const STEPS = [
  {
    icon: Zap,
    text: 'eTIMS records invoices in real time.',
  },
  {
    icon: BookOpen,
    text: 'Sales and purchases automatically reflect in your ledger.',
  },
  {
    icon: ClipboardCheck,
    text: 'Your return is partially completed for you.',
  },
  {
    icon: Send,
    text: 'You only review, confirm, and submit.',
  },
  {
    icon: Calendar,
    text: 'From 2026, only eTIMS-supported invoices will be recognized for validation.',
  },
  {
    icon: Gauge,
    text: 'This reduces errors and speeds up processing.',
  },
] as const;

/** Inner component that reads search params */
function PrePopulationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const phone = searchParams.get('phone') || '';

  return (
    <Layout
      title="Pre-Populated Filing"
      phone={phone}
      showFooter={false}
      onBack={() => router.push(`/campaign?phone=${encodeURIComponent(phone)}`)}
    >
      <div className="space-y-5">
        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-900">
            How does pre-populated filing work?
          </h2>
          <p className="text-xs text-gray-500">
            Filing has never been simpler.
          </p>
        </div>

        {/* Step-by-step content */}
        <Card className="space-y-0 divide-y divide-gray-100">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-xs font-bold text-purple-600">
                    {index + 1}
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed pt-1">
                  {item.text}
                </p>
              </div>
            );
          })}
        </Card>

        {/* Micro-feedback widget */}
        <MicroFeedback pageId="pre-population" />
      </div>
    </Layout>
  );
}

export default function PrePopulationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-sm">
          Loading...
        </div>
      }
    >
      <PrePopulationContent />
    </Suspense>
  );
}
