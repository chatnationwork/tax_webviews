"use server";

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
    obligations: string[];
  };
}

// ============= Retrieval APIs =============

/**
 * Retrieve KRA PIN by ID Number
 */
export async function retrievePinById(
  pinOrId: string,
  msisdn: string,
): Promise<PinRetrievalResult> {
  if (!pinOrId) return { success: false, error: "ID number is required" };
  if (!msisdn) return { success: false, error: "Phone number is required" };

  const cleanNumber = cleanPhoneNumber(msisdn);

  try {
    // Rely on auth headers for the session
    const headers = await getAuthHeaders();

    // Add the specific whatsapp source header
    const requestHeaders = {
      ...headers,
      "x-forwarded-for": "whatsapp",
      accept: "application/json",
    };

    console.log(`Calling Retrieval API: ${BASE_URL}/buyer-initiated/lookup`);

    const response = await axios.post(
      `${BASE_URL}/buyer-initiated/lookup`,
      { pin_or_id: pinOrId.trim() },
      {
        headers: requestHeaders,
        timeout: 30000,
      },
    );

    console.log(
      "PIN Retrieval API response:",
      JSON.stringify(response.data, null, 2),
    );

    const result = response.data;

    // Success if code is 3 (Valid ID Number)
    if (result && result.code === 3) {
      // Send WhatsApp Template Result (Fire and forget)

      sendPinRetrievalTemplate(
        cleanNumber,
        result.name,
        result.pin,
        result.obligations || [],
      ).catch((err) => console.error("WhatsApp Background Error:", err));

      return {
        success: true,
        data: {
          code: result.code,
          message: result.message,
          name: result.name,
          pin: result.pin,
          idNumber: pinOrId.trim(),
          obligations: result.obligations || [],
        },
      };
    }

    return {
      success: false,
      error: result.message || "Invalid ID Number or record not found",
    };
  } catch (error: any) {
    console.error(
      "PIN Retrieval API Error:",
      error.response?.data || error.message,
    );
    return {
      success: false,
      error:
        error.response?.data?.message ||
        "Failed to retrieve your PIN. Please try again later.",
    };
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
    console.error("WhatsApp credentials missing");
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
    console.error(
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
