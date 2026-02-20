'use client';

// Tracks the completion of the NIL filing journey and associates the event with the user's phone number as user_id
import { useEffect, useRef } from 'react';
import { analytics } from '@/app/_lib/analytics';

export function JourneyCompletionTracker({ success, phone }: { success: boolean; phone?: string }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (success && !trackedRef.current) {
      if (phone) analytics.setUserId(phone);
      analytics.track('nil_submission_completed', { success: true }, { journey_end: true });
      trackedRef.current = true;
    }
  }, [success, phone]);

  return null;
}
