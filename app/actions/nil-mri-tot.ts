'use server';

import axios from 'axios';
import { cookies } from 'next/headers';
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
import { cleanPhoneNumber } from '../_lib/utils';


const BASE_URL = 'https://kratest.pesaflow.com/api/ussd';

// Obligation IDs
const OBLIGATION_IDS = {
  VAT: '1',
  ITR: '2',
  PAYE: '7',
  TOT: '8',
  MRI: '33',
  AHL: '41',
  NITA: '42',
} as const;

// ============= Types =============

export interface TaxpayerObligation {
  obligationId: string;
  obligationName: string;
}

export interface TaxpayerObligationsResult {
  success: boolean;
  obligations?: TaxpayerObligation[];
  message?: string;
}

export interface FilingPeriodResult {
  success: boolean;
  periods?: string[];
  message?: string;
}

export interface FileReturnResult {
  success: boolean;
  code: number;
  message: string;
  receiptNumber?: string;
}

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

// ============= Helpers =============

// Using shared getAuthHeaders
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


// ============= Lookup & Obligations =============

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
  const cleanNumber = cleanPhoneNumber(phoneNumber);

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
          error: `Information Mismatch`
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
 * Get taxpayer obligations
 */
export async function getTaxpayerObligations(
  pin: string
): Promise<TaxpayerObligationsResult> {
  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(`${BASE_URL}/tax-payer-obligations/${pin}`,
      {
        headers
      }
    );

    const data = response.data;
    
    let obligations: TaxpayerObligation[] = [];
    
    if (Array.isArray(data)) {
      obligations = data.map((item: any) => ({
        obligationId: item.obligation_id || item.id,
        obligationName: item.obligation_name || item.name,
      }));
    } else if (data.obligations && Array.isArray(data.obligations)) {
      obligations = data.obligations.map((item: any) => ({
        obligationId: item.obligation_id || item.id,
        obligationName: item.obligation_name || item.name,
      }));
    }

    // Filter obligations based on allowed list
    const allowedKeywords = ['Income Tax', 'MRI', 'VAT', 'PAYE', 'Turnover Tax'];
    obligations = obligations.filter(obl =>  
      allowedKeywords.some(keyword => 
        obl.obligationName?.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    console.log('Obligations:', obligations);

    return {
      success: true,
      obligations: obligations,
    };
  } catch (error: any) {
    console.error('Get Obligations Error:', error.response?.data || error.message);
    
    return {
      success: false,
      obligations: [],
      message: 'Failed to retrieve obligations',
    };
  }
}

/**
 * Get available filing periods for an obligation
 */
export async function getFilingPeriods(
  pin: string,
  obligationId: string
): Promise<FilingPeriodResult> {
  try {
    const headers = await getApiHeaders(true);
    const response = await axios.post(
      `${BASE_URL}/obligation-filling-period`,
      {
        branch_id: '',
        from_date: '',
        from_itms_or_prtl: 'PRTL',
        is_amended: 'N',
        obligation_id: obligationId,
        pin: pin,
      },
      {
        headers
      }
    );

    const data = response.data;
    
    return {
      success: true,
      periods: data.periods || [],
      message: data.message,
    };
  } catch (error: any) {
    console.error('Filing Period Error:', error.response?.data || error.message);
    
    return {
      success: false,
      periods: [],
      message: error.response?.data || error.message || 'Failed to retrieve filing periods',
    };
  }
}

// ============= Filing =============

/**
 * File a NIL return
 */
export async function fileNilReturn(
  taxPayerPin: string,
  obligationId: string,
  returnPeriod: string
): Promise<FileReturnResult> {
  try {
    const headers = await getApiHeaders(true);
    const response = await axios.post(
      `${BASE_URL}/file-return`,
      {
        kra_obligation_id: obligationId,
        returnPeriod: returnPeriod,
        returnType: 'nil_return',
        tax_payer_pin: taxPayerPin,
      },
      {
        headers
      }
    );

    const data = response.data;
    const isSuccess = data.code === 1 || data.code === 200 || data.success === true;
    
    return {
      success: isSuccess,
      code: data.code || 200,
      message: data.message || 'NIL Return filed successfully',
      receiptNumber: data.receipt_number || data.receiptNumber,
    };
  } catch (error: any) {
    console.error('File NIL Return Error:', error.response?.data || error.message);
    
    return {
      success: false,
      code: error.response?.status || 500,
      message: error.response?.data?.message || error.response?.data?.errors?.detail || 'Failed to file NIL return. Please try again or contact support.',
    };
  }
}

/**
 * File a MRI (Monthly Rental Income) return with amount
 */
export async function fileMriReturn(
  taxPayerPin: string,
  returnPeriod: string,
  rentalIncome: number
): Promise<FileReturnResult> {
  try {
    const headers = await getApiHeaders(true);
    const response = await axios.post(
      `${BASE_URL}/file-return`,
      {
        kra_obligation_id: OBLIGATION_IDS.MRI,
        returnPeriod: returnPeriod,
        returnType: 'mri_return',
        tax_payer_pin: taxPayerPin,
        rental_income: rentalIncome,
        tax_amount: rentalIncome * 0.1, 
      },
      {
        headers
      }
    );

    const data = response.data;
    
    return {
      success: data.code === 1 || data.code === 200 || data.success === true,
      code: data.code || 200,
      message: data.message || 'MRI Return filed successfully',
      receiptNumber: data.receipt_number || data.receiptNumber || `MRI-${Date.now()}`,
    };
  } catch (error: any) {
    console.error('File MRI Return Error:', error.response?.data || error.message);
    
    return {
      success: false,
      code: error.response?.status || 500,
      message: error.response?.data?.message || error.response?.data?.errors?.detail || 'Failed to file MRI return. Please try again or contact support.',
    };
  }
}

/**
 * File a TOT (Turnover Tax) return
 */
export async function fileTotReturn(
  taxPayerPin: string,
  returnPeriod: string,
  grossSales: number,
  filingMode: 'Daily' | 'Monthly' | 'daily' | 'monthly',
  paymentAction: 'file_and_pay' | 'file_only' | 'pay_only'
): Promise<FileReturnResult> {
  try {
    const headers = await getApiHeaders(true);
    // Parse return period "DD/MM/YYYY - DD/MM/YYYY" or single date
    let startDate = returnPeriod;
    let endDate = returnPeriod;
    
    if (returnPeriod.includes('-')) {
      const parts = returnPeriod.split('-').map(p => p.trim());
      if (parts.length >= 2) {
        startDate = parts[0];
        endDate = parts[1];
      }
    }

    const response = await axios.post(
      `${BASE_URL}/file-return`,
      {
        tax_payer_pin: taxPayerPin,
        kra_obligation_id: OBLIGATION_IDS.TOT,
        start_date: startDate,
        end_date: endDate,
        filingCycle: filingMode.toLowerCase() === 'monthly' ? 'M' : 'D',
        taxable_amount: grossSales,
        payment_action: paymentAction
      },
      {
        headers
      }
    );

    const data = response.data;
    
    return {
      success: data.code === 1 || data.code === 200 || data.success === true,
      code: data.code || 200,
      message: data.message || 'TOT Return filed successfully',
      receiptNumber: data.receipt_number || data.receiptNumber || `TOT-${Date.now()}`,
    };
  } catch (error: any) {
    console.error('File TOT Return Error:', error.response?.data || error.message);
    
    return {
      success: false,
      code: error.response?.status || 500,
      message: error.response?.data?.message || error.response?.data?.errors?.detail || 'Failed to file TOT return. Please try again or contact support.',
    };
  }
}

// ============= Properties =============

export interface Property {
  Building: string;
  LandlordPIN: string;
  LocalityStr: string;
  PropertyRegId: string;
  UnitsEst: string;
  lrNo: string | null;
}

export interface PropertiesResult {
  success: boolean;
  properties?: Property[];
  message?: string;
}

/**
 * Get rental properties for a landlord
 */
export async function getProperties(pin: string): Promise<PropertiesResult> {
  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `https://kratest.pesaflow.com/api/properties/lookup/${pin}`,
      { headers }
    );

    const data = response.data;
    
    return {
      success: data.ResponseCode === '20000' || data.Status === 'OK',
      properties: data.PropertiesList || [],
      message: data.ResponseMsg
    };
  } catch (error: any) {
    console.error('Get Properties Error:', error.response?.data || error.message);
    
    return {
      success: false,
      properties: [],
      message: 'Failed to fetch properties'
    };
  }
}

// ============= Payment Actions =============

export interface GeneratePrnResult {
  success: boolean;
  message: string;
  prn?: string;
  data?: any;
}

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

    return {
      success: true,
      message: response.data.message || 'PRN generated successfully',
      prn: response.data.prn,
      data: response.data
    };
  } catch (error: any) {
    console.error('Generate PRN Error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to generate PRN',
    };
  }
}

export interface MakePaymentResult {
  success: boolean;
  message: string;
  data?: any;
}

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

    return {
      success: true,
      message: response.data.message || 'Payment initiated successfully',
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

/**
 * Send WhatsApp message
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageParams
): Promise<SendWhatsAppMessageResult> {
  return sharedSendWhatsAppMessage(params);
}
