/**
 * Server action to send the 4 campaign WhatsApp template messages
 * when a user opens the campaign landing page.
 *
 * Templates sent:
 *  1. how_prepopulation_works (no params)
 *  2. contact_reasons (no params)
 *  3. simplified_filing_services (no params)
 *  4. etims_video (header video link)
 */
'use server';

import axios from 'axios';
import { trackMessageSent } from '@/app/_lib/analytics-server';
import { cleanPhoneNumber } from '@/app/_lib/utils';

/** WhatsApp API base URL builder */
function getWhatsAppUrl(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID is not set');
  }
  return `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;
}

/** Returns the bearer token for the WhatsApp API */
function getToken(): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    throw new Error('WHATSAPP_ACCESS_TOKEN is not set');
  }
  return token;
}

/** Standard headers for WhatsApp API calls */
function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };
}

/** Template definition used internally */
interface CampaignTemplate {
  name: string;
  components: Record<string, unknown>[];
}

/**
 * Sends a single template message to a recipient via the WhatsApp API.
 * Returns true on success, false on failure (never throws).
 */
async function sendTemplate(
  to: string,
  template: CampaignTemplate
): Promise<boolean> {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      language: { policy: 'deterministic', code: 'en' },
      name: template.name,
      components: template.components,
    },
  };

  try {
    await axios.post(getWhatsAppUrl(), payload, {
      headers: getHeaders(),
      timeout: 15000,
    });

    await trackMessageSent({
      recipient_phone: to,
      message_type: 'template',
      template_name: template.name,
    });

    console.log(`[Campaign] Sent template "${template.name}" to ${to}`);
    return true;
  } catch (error: unknown) {
    const axiosErr = error as { response?: { data?: unknown }; message?: string };
    console.error(
      `[Campaign] Failed to send "${template.name}" to ${to}:`,
      axiosErr.response?.data || axiosErr.message
    );
    return false;
  }
}

/**
 * Sends all 4 campaign templates to the given phone number.
 * Called once when the campaign page loads.
 *
 * @param phone  - recipient phone from URL params
 * @param videoUrl - public URL of the eTIMS explainer video
 */
export async function sendCampaignTemplates(
  phone: string,
  videoUrl: string
): Promise<{ sent: number; failed: number }> {
  if (!phone) {
    console.warn('[Campaign] No phone provided — skipping templates');
    return { sent: 0, failed: 0 };
  }

  const cleanNumber = cleanPhoneNumber(phone);

  const templates: CampaignTemplate[] = [
    { name: 'how_prepopulation_works', components: [] },
    { name: 'contact_reasons', components: [] },
    { name: 'simplified_filing_services', components: [] },
    {
      name: 'etims_video',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'video',
              video: { link: videoUrl },
            },
          ],
        },
      ],
    },
  ];

  const results = await Promise.all(
    templates.map((tpl) => sendTemplate(cleanNumber, tpl))
  );

  const sent = results.filter(Boolean).length;
  const failed = results.length - sent;

  console.log(`[Campaign] Templates sent: ${sent}, failed: ${failed}`);
  return { sent, failed };
}
