'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

// Initialize PostHog only on client side
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    // Privacy-first: disable personal data collection
    disable_persistence: false,
    persistence: 'localStorage',
    autocapture: false, // Manual tracking only
    capture_pageview: true, // Auto-track page views
    capture_pageleave: true, // Track when users leave
    // Don't mask any specific data since we won't collect PII
    mask_all_text: false,
    mask_all_element_attributes: false,
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// Hook for tracking flow steps
export function useFlowTracking(flowType: string, stepName: string, stepNumber: number) {
  useEffect(() => {
    posthog.capture('step_viewed', {
      flow_type: flowType,
      step_name: stepName,
      step_number: stepNumber,
    });
    
    return () => {
      // Track when user leaves this step (potential dropout)
      posthog.capture('step_exited', {
        flow_type: flowType,
        step_name: stepName,
        step_number: stepNumber,
      });
    };
  }, [flowType, stepName, stepNumber]);
}

// Helper for tracking flow completion
export function trackFlowCompleted(flowType: string) {
  posthog.capture('flow_completed', {
    flow_type: flowType,
  });
}

// Helper for tracking flow start
export function trackFlowStarted(flowType: string) {
  posthog.capture('flow_started', {
    flow_type: flowType,
  });
}
