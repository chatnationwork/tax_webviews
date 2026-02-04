'use client';

import { useEffect, useRef } from 'react';
import { analytics } from '@/app/_lib/analytics';

export function JourneyCompletionTracker({ success }: { success: boolean }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (success && !trackedRef.current) {
      analytics.track('nil_submission_completed', { success: true }, { journey_end: true });
      trackedRef.current = true;
    }
  }, [success]);

  return null;
}
