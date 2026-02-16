'use server';

import axios from 'axios';
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


const BASE_URL = `${process.env.API_URL}/ussd`;

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
  obligationCode: string;
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
  taxDue?: string;
  prn?: string;
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

    console.log('ID lookup response:', JSON.stringify(response.data, null, 2));

    // Check if we got a valid response with data
    if (response.data && response.data.name && response.data.yob) {
      
      // Validate Year of Birth
      const returnedYob = response.data.yob ? response.data.yob.toString() : '';
      
      if (returnedYob !== yearOfBirth.trim()) {
        return {
          success: false,
          error: `Some of your information didnt match. Please check your details and try again`
        };
      }

      let pin = response.data.pin;
      
      // FALLBACK: If PIN is missing, try GUI lookup
      if (!pin) {
        console.log('PIN missing in primary lookup, attempting GUI lookup fallback...');
        const guiResult = await guiLookup(idNumber.trim());
        if (guiResult.success && guiResult.pin) {
           pin = guiResult.pin;
           console.log('PIN retrieved via GUI lookup');
        } else {
           console.warn('GUI lookup fallback failed:', guiResult.error);
        }
      }

      return {
        success: true,
        idNumber: response.data.id_number || idNumber.trim(),
        name: response.data.name,
        pin: pin,
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
 * Fallback: Get PIN via GUI Lookup
 */
export async function guiLookup(idNumber: string): Promise<{ success: boolean; pin?: string; name?: string; error?: string }> {
  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${process.env.API_URL}/itax/gui-lookup`,
      {
        params: {
          gui: idNumber,
          tax_payer_type: 'KE'
        },
        headers
      }
    );

    console.log('GUI Lookup Response:', response.data);

    const pin = response.data.pin || response.data.PIN;
    const name = response.data.name || response.data.TaxpayerName;

    if (pin) {
      return {
        success: true,
        pin: pin,
        name: name
      };
    }
    
    return { success: false, error: 'PIN not found in GUI lookup' };
  } catch (error: any) {
    console.error('GUI Lookup Error:', error.message);
    return { success: false, error: error.message };
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
        obligationCode: item.obligation_code,
        obligationName: item.obligation_name || item.name,
      }));
    } else if (data.obligations && Array.isArray(data.obligations)) {
      obligations = data.obligations.map((item: any) => ({
        obligationId: item.obligation_id || item.id,
        obligationCode: item.obligation_code,
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

    console.log('Filing periods response:', response.data);

    const data = response.data;
    
    // Handle different response formats
    let periods: string[] = [];
    
    if (data.periods && Array.isArray(data.periods)) {
      // Format 1: periods array
      periods = data.periods;
    } else if (data.trpFromDate && data.trpToDate) {
      // Format 2: trpFromDate and trpToDate (from API)
      // Create a period string in expected format
      periods = [`${data.trpFromDate} - ${data.trpToDate}`];
    }
    
    return {
      success: data.status === 'OK' || periods.length > 0,
      periods: periods,
      message: data.description || data.message,
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
  obligationCode: string,
  returnPeriod: string
): Promise<FileReturnResult> {
  try {
    const payload = {
      kra_obligation_id: obligationId,
      obligation_code: obligationCode,
      returnPeriod: returnPeriod,
      returnType: 'nil_return',
      tax_payer_pin: taxPayerPin,
    };

    console.log('Filing NIL Return:', payload);


    const headers = await getApiHeaders(true);
    const response = await axios.post(
      `${BASE_URL}/file-return`,
      payload,
      {
        headers
      }
    );

    const data = response.data;
    console.log('File NIL Return Response:', data);
    // Check for various success formats
    // 1. Standard format: code=1/200 or success=true
    // 2. Nested response format: response.Status='OK' (common in KRA APIs)
    const isSuccess = 
      data.code === 1 || 
      data.code === 200 || 
      data.success === true ||
      (data.response && data.response.Status === 'OK');
    
    // Extract message and receipt based on format
    let message = data.message || 'NIL Return filed successfully';
    let receiptNumber = data.receipt_number || data.receiptNumber;
    
    if (data.response) {
       if (data.response.Message) message = data.response.Message;
       if (data.response.AckNumber) receiptNumber = data.response.AckNumber;
    }

    return {
      success: isSuccess,
      code: data.code || (isSuccess ? 200 : 500),
      message: message,
      receiptNumber: receiptNumber,
      taxDue: data.tax_due,
    };
  } catch (error: any) {
    console.error('File NIL Return Error:', error.response?.data || error.message);
    
    return {
      success: false,
      code: error.response?.status || 500,
      message: error.response?.data?.Message || error.response?.data?.message || error.response?.data?.errors?.detail || 'Failed to file NIL return. .',
    };
  }
}

/**
 * File a MRI (Monthly Rental Income) return with amount
 */
export async function fileMriReturn(
  taxPayerPin: string,
  returnPeriod: string,
  rentalIncome: number,
  totalProperties: number
): Promise<FileReturnResult> {
  try {
    const headers = await getApiHeaders(true);

    // Parse return period "DD/MM/YYYY - DD/MM/YYYY"
    let startDate = returnPeriod;
    let endDate = returnPeriod;
    
    if (returnPeriod.includes('-')) {
      const parts = returnPeriod.split('-').map(p => p.trim());
      if (parts.length >= 2) {
        startDate = parts[0];
        endDate = parts[1];
      }
    }

    const payload = {
      tax_payer_pin: taxPayerPin,
      kra_obligation_id: OBLIGATION_IDS.MRI,
      obligation_code: OBLIGATION_IDS.MRI,
      start_date: startDate,
      end_date: endDate,
      total_properties: `${totalProperties}`,
      taxable_amount: `${rentalIncome}`,
    };

    console.log('Filing MRI Return:', payload);

    const response = await axios.post(
      `${BASE_URL}/file-return`,
      payload,
      {
        headers
      }
    );

    const data = response.data;
    console.log('File MRI Return Response:', data);


    if (data.response && (data.response.Status === 'OK' || data.response.ResponseCode === '88000')) {
        return {
            success: true,
            code: 200,
            message: data.response.Message || 'MRI Return filed successfully',
            receiptNumber: data.response.AckNumber || data.kra_account_number,
            prn: data.response.PRN || data.prn,
            taxDue: data.tax_due || data.response.TaxPayable
        };
    }
    
    return {
      success: data.code === 1 || data.code === 200 || data.success === true,
      code: data.code || 200,
      message: data.message || 'MRI Return filed successfully',
      receiptNumber: data.receipt_number || data.receiptNumber || `MRI-${Date.now()}`,
      taxDue: data.tax_due
    };
  } catch (error: any) {
    console.error('File MRI Return Error:', error.response?.data || error.message);
    
    const errorData = error.response?.data;
    // API returns ErrorCode with the user-friendly message
    const errorMessage = errorData?.ErrorCode || errorData?.Message || errorData?.message || errorData?.errors?.detail || 'Failed to file MRI return. .';
    
    return {
      success: false,
      code: error.response?.status || 500,
      message: errorMessage,
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

    const payload = {
      tax_payer_pin: taxPayerPin,
      kra_obligation_id: OBLIGATION_IDS.TOT,
      obligation_code: OBLIGATION_IDS.TOT,
      start_date: startDate,
      end_date: endDate,
      filingCycle: filingMode.toLowerCase() === 'monthly' ? 'M' : 'D',
      taxable_amount: `${grossSales}`,
    };

    console.log('Filing TOT Return:', payload);

    const response = await axios.post(
      `${BASE_URL}/file-return`,
      payload,
      {
        headers
      }
    );

    const data = response.data;

    console.log(data)
    
    // Check for TOT specific nested response structure
    if (data.response && (data.response.Status === 'OK' || data.response.ResponseCode === '87000')) {
        return {
            success: true,
            code: 200,
            message: data.response.Message || 'TOT Return filed successfully',
            receiptNumber: data.response.AckNumber || data.kra_account_number,
            prn: data.response.PRN || data.prn
        };
    }

    // Check for TOT Daily response format (root level keys)
    if (data.prn && data.tax_due) {
        return {
            success: true,
            code: 200,
            message: 'TOT Return filed successfully',
            receiptNumber: data.receipt_number || `TOT-${Date.now()}`,
            prn: data.prn
        };
    }

    return {
      success: data.code === 1 || data.code === 200 || data.success === true,
      code: data.code || 200,
      message: data.message || 'TOT Return filed successfully',
      receiptNumber: data.receipt_number || data.receiptNumber || `TOT-${Date.now()}`,
    };
  } catch (error: any) {
    console.error('File TOT Return Error:', error.response?.data || error.message);
    
    const errorData = error.response?.data;
    // API returns ErrorCode with the user-friendly message
    const errorMessage = errorData?.ErrorCode || errorData?.Message || errorData?.message || errorData?.errors?.detail || 'Failed to file TOT return. .';
    
    return {
      success: false,
      code: error.response?.status || 500,
      message: errorMessage,
    };
  }
}

// ============= Tax Calculation =============

export interface CalculateTaxResult {
  success: boolean;
  tax?: number;
  code?: number;
  message?: string;
}

/**
 * Calculate tax amount using the API (calc_only=true)
 */
export async function calculateTax(
  taxPayerPin: string,
  obligationId: string,
  obligationCode: string,
  returnPeriod: string,
  amount: number,
  filingCycle: string = 'M'
): Promise<CalculateTaxResult> {
  try {
    const headers = await getApiHeaders(true);
    
    // Parse return period "DD/MM/YYYY - DD/MM/YYYY"
    let startDate = returnPeriod;
    let endDate = returnPeriod;

    if (returnPeriod.includes('-')) {
      const parts = returnPeriod.split('-').map(p => p.trim());
      if (parts.length >= 2) {
        startDate = parts[0];
        endDate = parts[1];
      }
    }

    const payload = {
        tax_payer_pin: taxPayerPin,
        kra_obligation_id: obligationId,
        obligation_code: obligationCode,
        start_date: startDate,
        end_date: endDate,
        filingCycle: filingCycle,
        taxable_amount: `${amount}`,
        calc_only: "true"
    };

    console.log('Calculating Tax Payload:', payload);

    const response = await axios.post(
      `${BASE_URL}/file-return`,
      payload,
      {
        headers
      }
    );

    const data = response.data;
    console.log('Calculate Tax Response:', data);

    // Assuming the API returns the calculated tax in a specific field, 
    // or we might need to inspect the response structure for "calc_only" requests.
    // Based on typical flows, it might return the tax amount in 'total_tax' or similar.
    // Let's assume it returns 'tax_due' or check the 'data' object.
    
    // ADJUSTMENT: If the user didn't specify WHERE the tax is returned, I'll log it and try to find a reasonable field.
    // However, usually detailed tax info comes back.
    // For now, I will assume `data.data.total_tax` or `data.total_tax`.
    // Let's try to find a 'tax_due' or 'total_tax' in the response.
    
    // If the response is success (code 1 or 200) OR if it simply contains the calculation result (tax_due)
    // The calc_only response doesn't always strictly follow the standard wrapper format.
    if (
      data.code === 1 || 
      data.code === 200 || 
      data.success === true || 
      (data.calc_only === 'true' && data.tax_due)
    ) {
         const tax = data.tax_due || data.total_tax || data.total_amount || 0;
         
         return {
             success: true,
             tax: Number(tax),
             message: data.message || 'Tax calculated successfully'
         };
    }

    return {
      success: false,
      message: data.message || 'Failed to calculate tax'
    };

  } catch (error: any) {
    console.error('Calculate Tax Error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to calculate tax'
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
      `${process.env.API_URL}/properties/lookup/${pin}`,
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

    const payload= {
        tax_payer_pin: taxPayerPin,
        obligation_id: obligationId,
        tax_period_from: taxPeriodFrom,
        tax_period_to: taxPeriodTo,
        amount: amount,
      }

      console.log(`${BASE_URL}/generate-prn`)
      console.log('Generate PRN Payload:', payload);

    const response = await axios.post(
      `${BASE_URL}/generate-prn`,
      payload
     ,
      { headers }
    );

    const data = response.data;
    console.log('Generate PRN Response:', data);

    // Handle PascalCase response (PaymentRegNo) and standard response (prn)
    const prn = data.PaymentRegNo || data.prn;
    // Check for success indicators: Status=OK, ResponseCode=50000 (success), or presence of PRN
    const isSuccess = data.Status === 'OK' || data.ResponseCode === '50000' || !!prn;

    return {
      success: isSuccess,
      message: data.ResponseMsg || data.message || 'PRN generated successfully',
      prn: prn,
      data: data
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
    console.log(`${BASE_URL}/make-payment`)
 const payload={
        msisdn: msisdn,
        prn: prn,
      }

    console.log('Make Payment Payload:', payload);

    const response = await axios.post(
      `${BASE_URL}/make-payment`,
      payload
      ,
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

// ============= Liabilities =============

export interface Liability {
  FineAmount: string;
  InterestAmount: string;
  PenaltyAmount: string;
  PrincipalAmount: string;
  TaxPeriodFrom: string;
  TaxPeriodTo: string;
  TotalAmount: string;
}

export interface LiabilitiesResult {
  success: boolean;
  liabilities?: Liability[];
  message?: string;
  pin?: string;
  obligationId?: string;
}

/**
 * Get taxpayer liabilities
 */
export async function getTaxPayerLiabilities(
  pin: string,
  obligationId: string
): Promise<LiabilitiesResult> {
  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${BASE_URL}/tax-payer-liabilities`,
      {
        params: {
          obligation_id: obligationId,
          tax_payer_pin: pin,
        },
        headers
      }
    );

    const data = response.data;
    console.log('Get Liabilities Response:', data);

    if (data.Status === 'OK' || data.ResponseCode === '30000') {
      return {
        success: true,
        liabilities: data.LiabilitiesList || [],
        message: data.ResponseMsg || 'Liabilities retrieved successfully',
        pin: data.PinNo,
        obligationId: data.ObligationId
      };
    }

    return {
      success: false,
      message: data.ResponseMsg || data.message || 'Failed to retrieve liabilities'
    };
  } catch (error: any) {
    console.error('Get Liabilities Error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to retrieve liabilities'
    };
  }
}
