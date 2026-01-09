'use server';

import axios from 'axios';
import { cookies } from 'next/headers';

const BASE_URL = 'https://kratest.pesaflow.com/api/ussd';

// ============= Types =============

export interface OTPResult {
  success: boolean;
  message: string;
  code?: number;
  token?: string;
  error?: string;
}

export interface SendWhatsAppMessageParams {
  recipientPhone: string;
  message: string;
}

export interface SendWhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendWhatsAppDocumentParams {
  recipientPhone: string;
  documentUrl: string;
  caption: string;
  filename: string;
}

export interface SendWhatsAppDocumentResult {
  success: boolean;
  messageId?: string;
  error?: string;
}



// ============= Helper Functions =============

// ============= Helper Functions =============

import { cleanPhoneNumber } from '../_lib/utils';
export async function getAuthHeaders() {

  const cookieStore = await cookies();
  const token = cookieStore.get('etims_auth_token')?.value || cookieStore.get('auth_token')?.value;
  return {
    'Content-Type': 'application/json',
    'x-source-for': 'whatsapp',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// ============= Auth Actions =============

/**
 * Generate OTP for phone verification
 * POST /api/ussd/otp
 */
export async function generateOTP(msisdn: string): Promise<OTPResult> {
  const cleanNumber = cleanPhoneNumber(msisdn);

  try {
    const response = await axios.post(
      `${BASE_URL}/otp`,
      { msisdn: cleanNumber },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-source-for': 'whatsapp',
        },
        timeout: 30000,
      }
    );

    console.log('Generate OTP response:', response.data);

    return {
      success: true,
      message: response.data.message || 'OTP sent successfully',
      code: response.data.code,
    };
  } catch (error: any) {
    console.error('Generate OTP error:', error.response?.data || error.message);
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to send OTP',
      error: error.response?.data?.message
    };
  }
}

/**
 * Validate OTP code and set session cookie
 * POST /api/ussd/validate-otp
 */
export async function validateOTP(msisdn: string, otp: string): Promise<OTPResult> {
  const cleanNumber = cleanPhoneNumber(msisdn);

  try {
    const response = await axios.post(
      `${BASE_URL}/validate-otp`,
      { 
        msisdn: cleanNumber,
        otp: otp.trim().toUpperCase(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-source-for': 'whatsapp',
        },
        timeout: 30000,
      }
    );

    console.log('Validate OTP response:', response.data);

    // Check for success (varies by API, sometimes success: false, sometimes code: 0)
    const isSuccess = response.data.success !== false && response.data.code !== 0;

    if (isSuccess) {
      const token = response.data.token;
      if (token) {
        const cookieStore = await cookies();
        
        // Set consolidated auth token
        cookieStore.set({
          name: 'etims_auth_token',
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 60, // 30 minutes
          path: '/',
        });

        // Set legacy auth token for compatibility
        cookieStore.set({
            name: 'auth_token',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 60, // 30 minutes
            path: '/',
        });

        // Store phone number
        cookieStore.set({
            name: 'phone_Number', // Legacy name used in payments/pin-registration
            value: cleanNumber,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });
      }
    }

    return {
      success: isSuccess,
      message: response.data.message || (isSuccess ? 'OTP validated successfully' : 'Invalid OTP'),
      code: response.data.code,
      token: response.data.token
    };
  } catch (error: any) {
    console.error('Validate OTP error:', error.response?.data || error.message);
    
    return {
      success: false,
      message: error.response?.data?.message || 'Invalid OTP',
      error: error.response?.data?.message
    };
  }
}

/**
 * Check if the user has a valid session and slide expiration
 */
export async function checkServerSession(): Promise<boolean> {
    const cookieStore = await cookies();
    const token = cookieStore.get('etims_auth_token') || cookieStore.get('auth_token');
    
    if (token) {
      // Sliding expiration: refresh cookies
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 60, // 30 minutes
        path: '/'
      };
      
      cookieStore.set('etims_auth_token', token.value, options);
      cookieStore.set('auth_token', token.value, options);
      return true;
    }
    
    return false;
}

/**
 * Logout the user by clearing the session tokens
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('etims_auth_token');
  cookieStore.delete('auth_token');
  // We explicitly keep 'phone_Number' intact for convenience
}

/**
 * Get the stored phone number from session (server-side)
 */
export async function getStoredPhoneServer(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get('phone_Number')?.value || null;
}

// ============= WhatsApp Actions =============

/**
 * Send a text message via WhatsApp to a user
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageParams
): Promise<SendWhatsAppMessageResult> {
  const { recipientPhone, message } = params;

  if (!recipientPhone || !message) {
    return { success: false, error: 'Recipient phone and message are required' };
  }

  const cleanNumber = cleanPhoneNumber(recipientPhone).replace(/^254/, ''); // API expects no prefix? Or 254? 
  // Wait, existing code:
  // if (cleanNumber.startsWith('0')) cleanNumber = '254' + ...
  // Payload 'to' field usually expects country code without +
  // In payments.ts: if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1);
  // It seems it expects 2547...
  
  const finalNumber = cleanPhoneNumber(recipientPhone);

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    console.error('WhatsApp API credentials not configured');
    return { success: false, error: 'WhatsApp sending not configured' };
  }

  const url = `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: finalNumber,
    type: "text",
    text: {
      preview_url: false,
      body: message
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id
    };
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || 'Failed to send message via WhatsApp'
    };
  }
}

/**
 * Send a document (PDF) via WhatsApp
 */
export async function sendWhatsAppDocument(
  params: SendWhatsAppDocumentParams
): Promise<SendWhatsAppMessageResult> {
  const { recipientPhone, documentUrl, caption, filename } = params;

  if (!recipientPhone || !documentUrl) {
    return { success: false, error: 'Recipient phone and document URL are required' };
  }

  const finalNumber = cleanPhoneNumber(recipientPhone);
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    return { success: false, error: 'WhatsApp configuration missing' };
  }

  const url = `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: finalNumber,
    type: "document",
    document: {
      link: documentUrl,
      caption: caption,
      filename: filename
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id
    };
  } catch (error: any) {
    console.error('Error sending WhatsApp document:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || 'Failed to send document'
    };
  }
}

// Template senders can be migrated here as needed, but for now base functions are key
