'use server';

import axios from 'axios';
import { cleanPhoneNumber } from '../_lib/utils';

import { 
  getAuthHeaders, 
  generateOTP as sharedGenerateOTP, 
  validateOTP as sharedValidateOTP,
  checkServerSession as sharedCheckSession,
  logout as sharedLogout,
  getStoredPhoneServer,
  sendWhatsAppMessage as sharedSendWhatsAppMessage,
  SendWhatsAppMessageParams,
  SendWhatsAppMessageResult
} from './auth';


const BASE_URL = 'https://kratest.pesaflow.com/api/ussd';

// Obligation IDs for KRA Payment Services
const OBLIGATION_IDS = {
  AHL: '41',  // Advance Housing Levy
  NITA: '42', // National Industrial Training Authority
} as const;

// ============= Types =============

export interface LookupByIdResult {
  success: boolean;
  error?: string;
  idNumber?: string;
  name?: string;
  pin?: string;
}

export interface GenerateOTPResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VerifyOTPResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface GeneratePrnResult {
  success: boolean;
  message: string;
  prn?: string;
  data?: any;
}

export interface MakePaymentResult {
  success: boolean;
  message: string;
  checkoutUrl?: string;
  data?: any;
}

// ============= Helpers =============

// Using shared getAuthHeaders, wrapping for backward compatibility if signature differs
async function getApiHeaders(requiresAuth: boolean = true) {
    if (!requiresAuth) {
        return {
            'Content-Type': 'application/json',
            'x-source-for': 'whatsapp',
        };
    }
    return getAuthHeaders();
}


// ============= OTP & Session =============

/**
 * Generate and send OTP to user's phone
 */
// OTP Actions delegated to shared auth

export async function generateOTP(msisdn: string): Promise<GenerateOTPResult> {
    const result = await sharedGenerateOTP(msisdn);
    return {
        success: result.success,
        message: result.message,
        error: result.error
    };
}

export async function verifyOTP(msisdn: string, otp: string): Promise<VerifyOTPResult> {
    const result = await sharedValidateOTP(msisdn, otp);
    return {
        success: result.success,
        message: result.message,
        error: result.error
    };
}


/**
 * Check if user has a valid session and slide expiration
 */
// Session helpers delegated

export async function checkSession(): Promise<boolean> {
    return sharedCheckSession();
}

export async function logout(): Promise<void> {
    return sharedLogout();
}

export async function getStoredPhone(): Promise<string | null> {
    return getStoredPhoneServer();
}


// ============= Lookup =============

/**
 * Lookup user details by ID number using lookup API
 */
export async function lookupById(idNumber: string, phoneNumber: string, yearOfBirth: string): Promise<LookupByIdResult> {
  if (!idNumber || idNumber.trim().length < 6) {
    return { success: false, error: 'ID number must be at least 6 characters' };
  }
  if (!phoneNumber) {
    return { success: false, error: 'Phone number is required' };
  }
  if (!yearOfBirth) {
    return { success: false, error: 'Year of birth is required' };
  }

  // Clean phone number
  let cleanNumber = phoneNumber.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (!cleanNumber.startsWith('254')) cleanNumber = '254' + cleanNumber;

  console.log('Looking up ID:', idNumber, 'Phone:', cleanNumber, 'YOB to verify:', yearOfBirth);

  try {
    const headers = await getApiHeaders(true);
    const response = await axios.post(
      'https://kratest.pesaflow.com/api/ussd/id-lookup',
      { 
        id_number: idNumber.trim(),
        msisdn: cleanNumber
      },
      { 
        headers, 
        timeout: 30000 
      }
    );

    console.log('ID lookup response:', JSON.stringify(response.data, null, 2));

    // Check if we got a valid response with data
    if (response.data && response.data.name && response.data.yob) {
      
      // Validate Year of Birth
      const returnedYob = response.data.yob ? response.data.yob.toString() : '';
      
      if (returnedYob !== yearOfBirth.trim()) {
        return {
          success: false,
          error: `Some of your information didn't match. Please check your details and try again.`
        };
      }

      return {
        success: true,
        idNumber: response.data.id_number || idNumber.trim(),
        name: response.data.name,
        pin: response.data.pin,
      };
    } else {
      return { 
        success: false, 
        error: response.data.message || 'ID lookup failed or invalid response' 
      };
    }
  } catch (error: any) {
    console.error('ID lookup error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'ID lookup failed' };
  }
}

// ============= Payment Actions =============

/**
 * Generate a Payment Reference Number (PRN)
 */
export async function generatePrn(
  taxPayerPin: string,
  obligationId: string,
  taxPeriodFrom: string,
  taxPeriodTo: string,
  amount: string
): Promise<GeneratePrnResult> {
  try {
    const headers = await getApiHeaders(true);
    const response = await axios.post(
      `${BASE_URL}/generate-prn`,
      {
        tax_payer_pin: taxPayerPin,
        obligation_id: obligationId,
        tax_period_from: taxPeriodFrom,
        tax_period_to: taxPeriodTo,
        amount: amount,
      },
      { headers }
    );

    console.log('Generate PRN Response:', response.data);

    // API returns PaymentRegNo field for the PRN
    const prn = response.data.PaymentRegNo || response.data.prn;
    
    // Check if API returned an error or no PRN
    if (response.data.Status !== 'OK' || !prn) {
      return {
        success: false,
        message: response.data.ResponseMsg || response.data.message || 'Failed to generate PRN',
        data: response.data
      };
    }

    return {
      success: true,
      message: response.data.ResponseMsg || 'PRN generated successfully',
      prn: prn,
      data: response.data
    };
  } catch (error: any) {
    console.error('Generate PRN Error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.response?.data?.ResponseMsg || error.message || 'Failed to generate PRN',
    };
  }
}

/**
 * Initiate M-Pesa STK push for payment
 */
export async function makePayment(
  msisdn: string,
  prn: string
): Promise<MakePaymentResult> {
  try {
    const headers = await getApiHeaders(true);
    const response = await axios.post(
      `${BASE_URL}/make-payment`,
      {
        msisdn: msisdn,
        prn: prn,
      },
      { headers }
    );

    console.log('Make Payment Response:', response.data);

    // API returns status: 200 and desc: "ok" for success
    if (response.data.status === 200 || response.data.desc === 'ok') {
      return {
        success: true,
        message: response.data.message || 'Payment initiated successfully. Check your phone for M-Pesa prompt.',
        checkoutUrl: response.data.checkout_url,
        data: response.data
      };
    }

    // Check for error responses
    return {
      success: false,
      message: response.data.message || response.data.desc || 'Payment initiation failed',
      checkoutUrl: response.data.checkout_url,
      data: response.data
    };
  } catch (error: any) {
    console.error('Make Payment Error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to initiate payment',
    };
  }
}

// ============= AHL & NITA Payment Helpers =============

/**
 * Generate PRN for AHL (Advance Housing Levy) payment
 */
export async function generateAhlPayment(
  taxPayerPin: string,
  taxPeriodFrom: string,
  taxPeriodTo: string,
  amount: string
): Promise<GeneratePrnResult> {
  return generatePrn(taxPayerPin, OBLIGATION_IDS.AHL, taxPeriodFrom, taxPeriodTo, amount);
}

/**
 * Generate PRN for NITA (National Industrial Training Authority) payment
 */
export async function generateNitaPayment(
  taxPayerPin: string,
  taxPeriodFrom: string,
  taxPeriodTo: string,
  amount: string
): Promise<GeneratePrnResult> {
  return generatePrn(taxPayerPin, OBLIGATION_IDS.NITA, taxPeriodFrom, taxPeriodTo, amount);
}

// Types imported from ./auth


/**
 * Send a text message via WhatsApp to a user
 * Used for sending notifications, confirmations, etc.
 */
/**
 * Send a text message via WhatsApp to a user
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageParams
): Promise<SendWhatsAppMessageResult> {
    return sharedSendWhatsAppMessage(params);
}