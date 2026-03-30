'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '@/app/_lib/analytics';
import { getKnownPhone } from '@/app/_lib/session-store';
import { useConfig } from '@/app/_lib/runtime-config';

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { analyticsWriteKey, analyticsEndpoint } = useConfig();

  useEffect(() => {
    let campaignId = undefined;
    let handshakeToken = undefined;
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        campaignId = urlParams.get('campaignId') || undefined;
        handshakeToken = urlParams.get('handshake_token') || undefined;
    }

    analytics.init(analyticsWriteKey ?? '', {
      endpoint: analyticsEndpoint,
      campaignId,
      handshakeToken,
    });
  }, [analyticsWriteKey, analyticsEndpoint]);

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
          } else if (pathname.startsWith('/campaign')) {
            journeyName = 'Campaign';
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
