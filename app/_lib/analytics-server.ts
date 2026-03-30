import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import logger from '@/lib/logger';

// types.ts
export interface WhatsAppAnalyticsProps {
  message_id?: string;
  recipient_phone: string;
  message_type: 'text' | 'template' | 'interactive' | 'document' | 'other';
  content?: string; // For text messages
  template_name?: string; // For templates
  document_url?: string; // For documents
  document_filename?: string; // For documents
  interactive_type?: string; // button, list, etc.
  interactive_id?: string; // ID of the button/selection
}

export interface AnalyticsEvent {
  event_id: string;
  event_name: string; // "message.sent"
  event_type: 'track';
  session_id: string;
  timestamp: string;
  user_id: string; // The phone number
  anonymous_id: string; // effectively the same for server-side mostly
  context: {
    channel: string; // "whatsapp"
    [key: string]: any;
  };
  properties: {
    message_id?: string;
    from?: string; // "254..." (Our sender ID - standardizing on 'System' or the business number if available, but usually static)
    to?: string;
    type?: string;
    content?: string;
    template?: {
      name: string;
    };
    document?: {
      url: string;
      filename?: string;
    };
    interactive?: {
        type?: string;
        id?: string;
    }
    [key: string]: any;
  };
}

export interface AnalyticsBatch {
  batch: AnalyticsEvent[];
  sent_at: string;
  write_key?: string;
}

const ANALYTICS_ENDPOINT = process.env.ANALYTICS_ENDPOINT;

/**
 * Track a message sent event to the analytics service.
 * This is a fire-and-forget operation that logs errors but doesn't throw.
 */
export async function trackMessageSent(props: WhatsAppAnalyticsProps): Promise<void> {

  if (!ANALYTICS_ENDPOINT) {
    logger.error('ANALYTICS_ENDPOINT is not defined');
    return;
  }

  logger.info('ANALYTICS_ENDPOINT:', ANALYTICS_ENDPOINT);
  try {
    const { 
      message_id, 
      recipient_phone, 
      message_type, 
      content, 
      template_name,
      document_url,
      document_filename,
      interactive_type,
      interactive_id
    } = props;

    // Clean phone number for user_id/to field
    let cleanPhone = recipient_phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.substring(1);
    else if (!cleanPhone.startsWith('254')) cleanPhone = '254' + cleanPhone;

    // Construct properties
    const properties: any = {
      message_id: message_id || `temp-${uuidv4()}`, // Fallback if regular ID missing (e.g. error case or mock)
      from: process.env.WHATSAPP_NUMBER,
      to: cleanPhone,
      type: message_type,
    };

    if (content) properties.content = content;
    
    if (message_type === 'template' && template_name) {
      properties.template = { name: template_name };
    }
    
    if (message_type === 'document' && document_url) {
      properties.document = { 
        url: document_url,
        filename: document_filename 
      };
    }

    if (message_type === 'interactive') {
        properties.interactive = {
            type: interactive_type,
            id: interactive_id // action name or button ID
        };
    }

    const event: AnalyticsEvent = {
      event_id: uuidv4(),
      event_name: 'message.sent',
      event_type: 'track',
      timestamp: new Date().toISOString(),
      session_id: uuidv4(),
      user_id: cleanPhone,
      anonymous_id: cleanPhone, // Using phone as stable identifier
      context: {
        channel: 'whatsapp'
      },
      properties: properties
    };

    const payload: AnalyticsBatch = {
      batch: [event],
      sent_at: new Date().toISOString(),
   
    };

    // Fire and forget - minimal await needed? 
    // We await to ensuring it fires before server action closes, but we catch errors.
    logger.info('[Analytics] Sending message.sent event:', event.event_id,JSON.stringify(payload));
    
    await axios.post(ANALYTICS_ENDPOINT, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Write-Key': process.env.ANALYTICS_WRITE_KEY || ''
      },
      timeout: 5000 // Short timeout to not block too long
    });

  } catch (error: any) {
    // Silent fail for analytics to not disrupt flow
    console.error('[Analytics] Failed to track message sent:', error.message);
  }
}

export interface CSATAnalyticsProps {
  rating: number;
  feedback: string;
  journey: string;
  inboxSessionId: string;
  phone: string;
  channel?: string;
}

export async function trackCsatSubmitted(props: CSATAnalyticsProps): Promise<void> {

  if (!ANALYTICS_ENDPOINT) {
    logger.error('ANALYTICS_ENDPOINT is not defined');
    return;
  }

  logger.info('ANALYTICS_ENDPOINT:', ANALYTICS_ENDPOINT);
  try {
    const { rating, feedback, journey, inboxSessionId, phone, channel } = props;

    // Clean phone number for user_id
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.substring(1);
    else if (!cleanPhone.startsWith('254')) cleanPhone = '254' + cleanPhone;

    const event: AnalyticsEvent = {
        event_id: uuidv4(),
        event_name: 'csat_submitted',
        event_type: 'track',
        timestamp: new Date().toISOString(),
        session_id: uuidv4(),
        user_id: cleanPhone,
        anonymous_id: cleanPhone,
        context: {
            channel: channel || 'webview',
            page: {
                path: '/csat',
                url: `${process.env.APP_URL}/csat`
            }
        },
        properties: {
            rating,
            feedback,
            journey,
            inboxSessionId
        }
    };

    const payload: AnalyticsBatch = {
        batch: [event],
        sent_at: new Date().toISOString(),
        write_key: process.env.ANALYTICS_WRITE_KEY
    };

    logger.info('[Analytics] Sending csat_submitted event:', event.event_id, JSON.stringify(payload));

    await axios.post(ANALYTICS_ENDPOINT, payload, {
        headers: {
            'Content-Type': 'application/json',
            'X-Write-Key': process.env.ANALYTICS_WRITE_KEY || ''
        },
        timeout: 5000
    });

  } catch (error: any) {
    console.error('[Analytics] Failed to track CSAT:', error.message);
  }
}
