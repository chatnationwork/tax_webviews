'use server';

import logger from '@/lib/logger';

import { trackCsatSubmitted } from '../_lib/analytics-server';

export interface SubmitCsatFeedbackParams {
  rating: number;
  feedback: string;
  journey: string;
  inboxSessionId: string;
  phone: string;
  channel?: string;
}

export async function submitCsatFeedback(params: SubmitCsatFeedbackParams) {
  try {
    await trackCsatSubmitted({
      rating: params.rating,
      feedback: params.feedback,
      journey: params.journey,
      inboxSessionId: params.inboxSessionId,
      phone: params.phone,
      channel: params.channel
    });
    
    return { success: true };
  } catch (error) {
    logger.error('Failed to submit CSAT feedback:', error);
    return { success: false, error: 'Failed to submit feedback' };
  }
}
