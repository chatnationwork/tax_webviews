'use server';

import axios from 'axios';
import { cookies } from 'next/headers';
import { 
  getAuthHeaders, 
  generateOTP as sharedGenerateOTP, 
  validateOTP as sharedValidateOTP,
  OTPResult,
} from './auth';
import { cleanPhoneNumber } from '../_lib/utils';



const BASE_URL = 'https://kratest.pesaflow.com/api/ussd';

// ============= Types =============

// Types & Helpers imported from ./auth


export interface LookupByIdResult {
  success: boolean;
  error?: string;
  idNumber?: string;
  name?: string;
  pin?: string;
}

export interface PinRegistrationResult {
  success: boolean;
  code?: number;
  message: string;
  pin?: string;
  receiptNumber?: string;
}

// ============= Helper Functions =============

// Types & Helpers imported from ./auth


// ============= API Functions =============

/**
 * Generate OTP for phone verification
 * POST /api/ussd/otp
 */
/**
 * Generate OTP for phone verification
 * (Delegates to shared auth action)
 */
export async function generateOTP(msisdn: string): Promise<OTPResult> {
    return sharedGenerateOTP(msisdn);
}


/**
 * Validate OTP code and set session cookie
 * POST /api/ussd/validate-otp
 */
/**
 * Validate OTP code and set session cookie
 * (Delegates to shared auth action)
 */
export async function validateOTP(msisdn: string, otp: string): Promise<OTPResult> {
    return sharedValidateOTP(msisdn, otp);
}


/**
 * Lookup taxpayer by ID number
 * Primary: GET /api/itax/gui-lookup
 * Fallback: POST /api/ussd/id-lookup
 */

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
    const headers = await getAuthHeaders();
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

/**
 * Submit PIN Registration
 * POST /api/ussd/pin-registration
 */
export async function submitPinRegistration(
  type: 'citizen' | 'resident',
  idNumber: string,
  email: string,
  msisdn: string
): Promise<PinRegistrationResult> {
  const cleanNumber = cleanPhoneNumber(msisdn);
  const headers = await getAuthHeaders();

  console.log('Submitting PIN registration:', {
    type,
    id_number: idNumber,
    email,
    msisdn: cleanNumber,
  });

  try {
    const response = await axios.post(
      `${BASE_URL}/pin-registration`,
      {
        type: type,
        email: email,
        msisdn: cleanNumber,
        id_number: idNumber,
      },
      {
        headers: headers,
        timeout: 60000, // Longer timeout for registration
      }
    );

    console.log('PIN Registration response:', JSON.stringify(response.data, null, 2));

    const data = response.data;
    
    return {
      success: data.success !== false && !data.error,
      code: data.code,
      message: data.message || 'PIN Registration submitted successfully',
      pin: data.pin || data.kra_pin,
      receiptNumber: data.receipt_number || data.receiptNumber || `REG-${Date.now()}`,
    };
  } catch (error: any) {
    console.error('PIN Registration error:', error.response?.data || error.message);
    
    return {
      success: false,
      message: error.response?.data?.message || error.response?.data?.error || 'Failed to submit PIN registration',
    };
  }
}

/**
 * Initiate session for PIN registration
 * POST /api/ussd/initiate-session
 */
export async function initiateSession(
  idNumber: string,
  msisdn: string,
  type: 'citizen' | 'resident'
): Promise<{ success: boolean; message: string; sessionId?: string }> {
  const cleanNumber = cleanPhoneNumber(msisdn);
  const headers = await getAuthHeaders();

  try {
    const response = await axios.post(
      `${BASE_URL}/initiate-session`,
      {
        id_number: idNumber,
        msisdn: cleanNumber,
        type: type,
      },
      {
        headers: headers,
        timeout: 30000,
      }
    );

    console.log('Initiate session response:', response.data);

    return {
      success: true,
      message: response.data.message || 'Session initiated',
      sessionId: response.data.session_id,
    };
  } catch (error: any) {
    console.error('Initiate session error:', error.response?.data || error.message);
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to initiate session',
    };
  }
}


/**
 * Logout the user by clearing the session token
 */
import { logout as sharedLogout } from './auth';
export async function logout(): Promise<void> {
    return sharedLogout();
}

