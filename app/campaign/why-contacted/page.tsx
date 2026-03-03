/**
 * "Why Was I Contacted?" content page.
 *
 * Explains why KRA reached out (eTIMS transactional activity detection,
 * NIL / no submission discrepancy, voluntary reconciliation offer).
 * Includes a MicroFeedback widget at the bottom.
 *
 * Analytics: fires `campaign_page_view` on mount so drop-off between
 * the hub and this info page is measurable in the funnel dashboard.
 */
'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layout, Card } from '@/app/_components/Layout';
import MicroFeedback from '@/app/campaign/_components/MicroFeedback';
import { AlertCircle, Search, FileCheck, HelpCircle, ShieldCheck } from 'lucide-react';
import { analytics } from '@/app/_lib/analytics';

/** Bullet points displayed on this page */
const REASONS = [
  {
    icon: Search,
    text: 'Our systems detected transactional activity in 2025 via eTIMS.',
  },
  {
    icon: AlertCircle,
    text: 'Your filed return indicates NIL or no submission.',
  },
  {
    icon: FileCheck,
    text: 'We are offering you the opportunity to reconcile voluntarily.',
  },
  {
    icon: HelpCircle,
    text: 'If records are incorrect, you may seek clarification through our support channels or visit your station.',
  },
  {
    icon: ShieldCheck,
    text: 'Filing ensures accurate tax records and prevents future compliance issues.',
  },
] as const;

/** Inner component that reads search params */
function WhyContactedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const phone = searchParams.get('phone') || '';

  /**
   * Track that the user landed on this specific sub-page.
   * The AnalyticsProvider fires a generic page() event, but this
   * explicit track gives us a named funnel step we can filter on.
   */
  useEffect(() => {
    if (phone) analytics.setUserId(phone);
    analytics.track('campaign_page_view', { page: 'why-contacted' });
  }, [phone]);

  return (
    <Layout
      title="Why Was I Contacted?"
      phone={phone}
      showFooter={false}
      onBack={() => router.push(`/campaign?phone=${encodeURIComponent(phone)}`)}
    >
      <div className="space-y-5">
        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-900">
            Why did KRA send this notice?
          </h2>
          <p className="text-xs text-gray-500">
            We want to help you stay compliant.
          </p>
        </div>

        {/* Content bullets */}
        <Card className="divide-y divide-gray-100">
          {REASONS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {item.text}
                </p>
              </div>
            );
          })}
        </Card>

        {/* Micro-feedback widget */}
        <MicroFeedback pageId="why-contacted" />
      </div>
    </Layout>
  );
}

export default function WhyContactedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-sm">
          Loading...
        </div>
      }
    >
      <WhyContactedContent />
    </Suspense>
  );
}
