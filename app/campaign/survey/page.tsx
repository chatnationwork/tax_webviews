/**
 * Post-interaction survey page.
 *
 * Standalone route wrapping the PostSurvey component inside the shared Layout.
 * Linked from the Support & Feedback page after filing or support interactions.
 */
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layout } from '@/app/_components/Layout';
import PostSurvey from '@/app/campaign/_components/PostSurvey';

/** Inner component that reads search params */
function SurveyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const phone = searchParams.get('phone') || '';

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
