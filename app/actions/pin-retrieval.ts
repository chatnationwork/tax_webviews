"use server";

import logger from '@/lib/logger';

import axios from "axios";
import { getAuthHeaders, sendWhatsAppMessage } from "./auth";
import { trackMessageSent } from "../_lib/analytics-server";
import { cleanPhoneNumber } from "../_lib/utils";

const BASE_URL = `${process.env.API_URL}/ussd`;

// ============= Types =============

export interface PinRetrievalResult {
  success: boolean;
  error?: string;
  data?: {
    code: number;
    message: string;
    name: string;
    pin: string;
    idNumber: string;
  };
}

// ============= Retrieval APIs =============

/**
 * Retrieve KRA PIN by ID Number
 */
export async function retrievePinById(
  idNumber: string,
  phoneNumber: string,

): Promise<PinRetrievalResult> {
  if (!idNumber || idNumber.trim().length < 6) {
    return { success: false, error: 'ID number must be at least 6 characters' };
  }
  if (!phoneNumber) {
    return { success: false, error: 'Phone number is required' };
  }
 

  // Clean phone number
  const cleanNumber = cleanPhoneNumber(phoneNumber);

  logger.info('Looking up ID:', idNumber, 'Phone:', cleanNumber);

  try {
    const headers = await getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/id-lookup`,
      { 
        id_number: idNumber.trim(),
        msisdn: cleanNumber
      },
      { 
        headers, 
        timeout: 30000 
      }
    );

    logger.info('ID lookup response:', JSON.stringify(response.data, null, 2));

    // Check if we got a valid response with data
    if (response.data && response.data.name && response.data.yob) {

      let pin = response.data.pin;

      return {
        success: true,  
        error: "",
        data: {
          code: 3,
          message: "ID lookup successful",
          name: response.data.name,
          pin: pin,
          idNumber: idNumber.trim(),
        }
      }
    } else {
      return { 
        success: false, 
        error: response.data.message || 'ID lookup failed or invalid response' 
      };
    }
  } catch (error: any) {
    logger.error('ID lookup error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'ID lookup failed' };
  }
}

/**
 * Send PIN Retrieval result via WhatsApp Template
 */
export async function sendPinRetrievalTemplate(
  msisdn: string,
  name: string,
  pin: string,
  obligations: string[],
): Promise<{ success: boolean; error?: string }> {
  if (!msisdn) return { success: false, error: "Recipient phone required" };

  const cleanNumber = cleanPhoneNumber(msisdn);
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    logger.error("WhatsApp credentials missing");
    return { success: false, error: "Configuration error" };
  }

  const url = `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;
  const obligationsText = obligations.join(", ") || "N/A";

  const payload = {
    messaging_product: "whatsapp",
    to: cleanNumber,
    recipient_type: "individual",
    type: "template",
    template: {
      language: {
        policy: "deterministic",
        code: "en",
      },
      name: "pin_retrieval_success_clone",
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: name,
            },
            {
              type: "text",
              text: pin,
            },
          ],
        },
      ],
    },
  };

  try {
    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    await trackMessageSent({
      recipient_phone: cleanNumber,
      message_type: "template",
      template_name: "pin_retrieval_success",
    });

    return { success: true };
  } catch (error: any) {
    logger.error(
      "WhatsApp Template Error:",
      error.response?.data || error.message,
    );
    // Fallback to text message
    await sendWhatsAppMessage({
      recipientPhone: cleanNumber,
      message: `Dear ${name}, your KRA PIN is ${pin}. Registered obligations: ${obligationsText}`,
    });
    return { success: false, error: error.message };
  }
}
