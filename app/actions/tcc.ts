'use server';

import axios from 'axios';
import { 
  getAuthHeaders, 
  generateOTP as sharedGenerateOTP, 
  validateOTP as sharedValidateOTP,
  checkServerSession as sharedCheckSession,
  logout as sharedLogout,
  getStoredPhoneServer,
  OTPResult
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

// Using shared getAuthHeaders from auth.ts
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
// Delegated to shared auth.ts

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

// ============= TCC Application =============

// Note: TCC_REASONS and TccReasonKey are in app/_lib/tcc-constants.ts
// (Cannot export non-async values from 'use server' files)

export interface GuiLookupResult {
  success: boolean;
  error?: string;
  name?: string;
  pin?: string;
}

export interface TccApplicationResult {
  success: boolean;
  error?: string;
  message?: string;
  tccNumber?: string;
  status?: string;
  taxpayerName?: string;
}

/**
 * GUI Lookup - Verify taxpayer before TCC application
 * GET https://kratest.pesaflow.com/api/itax/gui-lookup
 */
export async function guiLookup(idNumber: string): Promise<GuiLookupResult> {
  if (!idNumber || idNumber.trim().length < 6) {
    return { success: false, error: 'ID number must be at least 6 characters' };
  }

  console.log('GUI Lookup for ID:', idNumber);

  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      'https://kratest.pesaflow.com/api/itax/gui-lookup',
      {
        params: {
          gui: idNumber.trim(),
          id: idNumber.trim(),
          tax_payer_type: 'KE',
        },
        headers,
        timeout: 30000,
      }
    );

    console.log('GUI Lookup response:', JSON.stringify(response.data, null, 2));

    // Check for success - API returns ResponseCode "30000" and Status "OK"
    if (response.data && (response.data.Status === 'OK' || response.data.ResponseCode === '30000')) {
      return {
        success: true,
        name: response.data.TaxpayerName || response.data.name,
        pin: response.data.PIN || response.data.pin,
      };
    } else {
      return {
        success: false,
        error: response.data.Message || response.data.message || 'GUI lookup failed',
      };
    }
  } catch (error: any) {
    console.error('GUI Lookup error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'GUI lookup failed',
    };
  }
}

/**
 * Submit TCC Application
 * POST https://kratest.pesaflow.com/api/ussd/tcc-application
 */
export async function submitTccApplication(
  taxPayerPin: string,
  reasonForTcc: string
): Promise<TccApplicationResult> {
  if (!taxPayerPin) {
    return { success: false, error: 'Taxpayer PIN is required' };
  }
  if (!reasonForTcc) {
    return { success: false, error: 'Reason for TCC is required' };
  }

  console.log('Submitting TCC Application:', { taxPayerPin, reasonForTcc });

  try {
    const headers = await getApiHeaders(true);
    const response = await axios.post(
      'https://kratest.pesaflow.com/api/ussd/tcc-application',
      {
        tax_payer_pin: taxPayerPin,
        reason_for_tcc: reasonForTcc,
      },
      {
        headers,
        timeout: 30000,
      }
    );

    console.log('TCC Application response:', JSON.stringify(response.data, null, 2));

    // Check for success response - API returns Status "OK" for success
    if (response.data && (response.data.Status === 'OK' || response.data.TCCNumber || response.data.tcc_number || response.data.success)) {
      return {
        success: true,
        message: response.data.Message || response.data.message || 'TCC Application submitted successfully',
        tccNumber: response.data.TCCNumber || response.data.tcc_number,
        status: response.data.Status || response.data.status,
        taxpayerName: response.data.TaxpayerName || response.data.name || response.data.taxpayer_name,
      };
    } else {
      return {
        success: false,
        error: response.data.Message || response.data.message || 'TCC Application failed',
      };
    }
  } catch (error: any) {
    console.error('TCC Application error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.Message || error.response?.data?.message || 'TCC Application failed',
    };
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
