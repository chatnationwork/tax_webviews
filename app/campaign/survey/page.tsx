/**
 * Post-interaction survey page.
 *
 * Standalone route wrapping the PostSurvey component inside the shared Layout.
 * Linked from the Support & Feedback page after filing or support interactions.
 *
 * Analytics: fires `campaign_survey_start` on mount to mark the beginning
 * of the survey funnel step, separate from the `campaign_survey_open` event
 * fired by the Support page when the CTA is tapped.
 */
'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layout } from '@/app/_components/Layout';
import PostSurvey from '@/app/campaign/_components/PostSurvey';
import { analytics } from '@/app/_lib/analytics';

/** Inner component that reads search params */
function SurveyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const phone = searchParams.get('phone') || '';

  /**
   * Track that the user has actually arrived at and started the survey.
   * This allows measurement of drop-off between the Support page CTA
   * (`campaign_survey_open`) and survey page load (`campaign_survey_start`).
   */
  useEffect(() => {
    if (phone) analytics.setUserId(phone);
    analytics.track('campaign_survey_start', { page: 'survey' });
  }, [phone]);

  return (
    <Layout
      title="Quick Survey"
      phone={phone}
      showFooter={false}
      onBack={() => router.push(`/campaign/support?phone=${encodeURIComponent(phone)}`)}
    >
      <div className="space-y-4">
        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-900">
            Help Us Improve
          </h2>
          <p className="text-xs text-gray-500">
            3 quick questions — takes less than 30 seconds.
          </p>
        </div>

        {/* Survey component */}
        <PostSurvey phone={phone} />
      </div>
    </Layout>
  );
}

export default function SurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-sm">
          Loading...
        </div>
      }
    >
      <SurveyContent />
    </Suspense>
  );
}
