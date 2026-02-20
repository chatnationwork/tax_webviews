'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '@/app/_lib/analytics';
import { getKnownPhone } from '@/app/_lib/session-store';

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
          // Attempt to get phone to use as user_id
          const phoneParam = searchParams.get('phone');
          let phone = phoneParam;
          
          if (!phone) {
            try {
              const known = getKnownPhone();
              if (known) phone = known;
            } catch (e) {
              console.error('Failed to get known phone', e);
            }
          }
          
          if (phone) {
            analytics.setUserId(phone);
          }

          // Determine journey name based on pathname
          let journeyName = document.title || 'eTIMS';
          if (pathname.includes('/nil-mri-tot/nil')) {
            journeyName = 'NIL Filling';
          } else if (pathname.includes('/nil-mri-tot/mri')) {
            journeyName = 'MRI Filling';
          } else if (pathname.includes('/nil-mri-tot/tot')) {
            journeyName = 'TOT Filling';
          } else if (pathname.includes('/payroll')) {
            journeyName = 'Payroll';
          } else if (pathname.includes('/otp') || pathname.includes('/onboarding')) {
            journeyName = 'Onboarding';
          }

          analytics.page(journeyName);
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
