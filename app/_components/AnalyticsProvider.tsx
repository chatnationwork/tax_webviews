'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '@/app/_lib/analytics';

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize analytics once
  useEffect(() => {
    // You should use an environment variable here
    const writeKey = process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY || 'default-write-key';
    analytics.init(writeKey);
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      // Small delay to ensure title is updated (next.js title handling)
      setTimeout(() => {
          analytics.page();
      }, 100);
    }
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {children}
    </>
  );
}
