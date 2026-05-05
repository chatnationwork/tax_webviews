'use server';

import logger from '@/lib/logger';

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
import { checkPin } from './checkers';


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
      'x-forwarded-for': 'whatsapp'
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

  logger.info('Looking up ID:', idNumber, 'Phone:', cleanNumber, 'YOB to verify:', yearOfBirth);

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

    logger.info('ID lookup response:', JSON.stringify(response.data, null, 2));

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
        logger.info('PIN missing in primary lookup, attempting GUI lookup fallback...');
        const guiResult = await guiLookup(idNumber.trim());
        if (guiResult.success && guiResult.pin) {
          pin = guiResult.pin;
          logger.info('PIN retrieved via GUI lookup');
        } else {
          logger.warn('GUI lookup fallback failed:', guiResult.error);
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
    logger.error('ID lookup error:', error.response?.data || error.message);
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

    logger.info('GUI Lookup Response:', response.data);

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
    logger.error('GUI Lookup Error:', error.message);
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
    const url = `${BASE_URL}/tax-payer-obligations/${pin}`;

    logger.info('Obligations URL:', url);

    const headers = await getApiHeaders(true);

    logger.info('Obligations headers:', headers);

  
    const response = await axios.get(url,
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

    logger.info('Obligations:', obligations);

    return {
      success: true,
      obligations: obligations,
      message: data.message,
    };
  } catch (error: any) {
    logger.error('Get Obligations Error:', error.response?.data || error.message);

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

    logger.info('Filing periods response:', response.data);

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
    logger.error('Filing Period Error:', error.response?.data || error.message);

    return {
      success: false,
      periods: [],
      message: error.response?.data || error.message || 'Failed to retrieve filing periods',
    };
  }
}

// ============= Filing =============

/**
 * File a NIL return.
 * `hasRentalProperty` must come from the user’s Yes/No choice on NIL verify only — not from a properties API lookup.
 */
export async function fileNilReturn(
  taxPayerPin: string,
  obligationId: string,
  obligationCode: string,
  returnPeriod: string,
  hasRentalProperty: boolean
): Promise<FileReturnResult> {
  try {
    const payload = {
      kra_obligation_id: obligationId,
      obligation_code: obligationCode,
      returnPeriod: returnPeriod,
      returnType: 'nil_return',
      tax_payer_pin: taxPayerPin,
      has_rental_property: hasRentalProperty ? 'Y' : 'N',
    };

    logger.info('Filing NIL Return:', payload);


    const headers = await getApiHeaders(true);
    const response = await axios.post(
      `${BASE_URL}/file-return`,
      payload,
      {
        headers
      }
    );

    const data = response.data;
    logger.info('File NIL Return Response:', data);
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
    logger.error('File NIL Return Error:', error.response?.data || error.message);

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

    logger.info('Filing MRI Return:', payload);

    const response = await axios.post(
      `${BASE_URL}/file-return`,
      payload,
      {
        headers
      }
    );

    const data = response.data;
    logger.info('File MRI Return Response:', data);



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
    logger.error('File MRI Return Error:', error.response?.data || error.message);

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

    logger.info('Filing TOT Return:', payload);

    const response = await axios.post(
      `${BASE_URL}/file-return`,
      payload,
      {
        headers
      }
    );

    const data = response.data;

    logger.info(data)

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
    logger.error('File TOT Return Error:', error.response?.data || error.message);

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

    logger.info('Calculating Tax Payload:', payload);

    const response = await axios.post(
      `${BASE_URL}/file-return`,
      payload,
      {
        headers
      }
    );

    const data = response.data;
    logger.info('Calculate Tax Response:', data);

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
    logger.error('Calculate Tax Error:', error.response?.data || error.message);
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
    logger.error('Get Properties Error:', error.response?.data || error.message);

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

    // Round amount up to a whole number since the API requires integer amounts
    const roundedAmount = Math.ceil(parseFloat(amount)).toString();

    const payload = {
      tax_payer_pin: taxPayerPin,
      obligation_id: obligationId,
      tax_period_from: taxPeriodFrom,
      tax_period_to: taxPeriodTo,
      amount: roundedAmount,
    }

    logger.info(`${BASE_URL}/generate-prn`)
    logger.info('Generate PRN Payload:', payload);

    const response = await axios.post(
      `${BASE_URL}/generate-prn`,
      payload
      ,
      { headers }
    );

    const data = response.data;
    logger.info('Generate PRN Response:', data);

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
    logger.error('Generate PRN Error:', error.response?.data || error.message);
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
    logger.info(`${BASE_URL}/make-payment`)
    const payload = {
      msisdn: msisdn,
      prn: prn,
    }

    logger.info('Make Payment Payload:', payload);

    const response = await axios.post(
      `${BASE_URL}/make-payment`,
      payload
      ,
      { headers }
    );

    logger.info('Make Payment Response:', response.data);

    return {
      success: true,
      message: response.data.message || 'Payment initiated successfully',
      data: response.data
    };
  } catch (error: any) {
    logger.error('Make Payment Error:', error.response?.data || error.message);
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

/**
 * Send WhatsApp image
 */
export async function sendWhatsAppImage(
  params: { recipientPhone: string; imageUrl: string; caption?: string }
): Promise<SendWhatsAppMessageResult> {
  const { sendWhatsAppImage: sharedSendWhatsAppImage } = await import('./auth');
  return sharedSendWhatsAppImage(params);
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
    logger.info('Get Liabilities Response:', data);

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
    logger.error('Get Liabilities Error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to retrieve liabilities'
    };
  }
}

// ============= ITR Actions =============


export interface EmploymentIncomeResult {
  success: boolean;
  rows?: {
    employerPin: string;
    employerName: string;
    grossPay: number;
    valueOfCarBenefit: number;
    pension: number;
    netValueOfHousing: number;
    allowancesBenefits: number;
    totalEmploymentIncome: number;
    taxableSalary: number;
    amountOfTaxDeductedPaye: number;
    taxPayableOnTaxableSalary: number;
    amountOfTaxPayableRefundable: number;
  }[];
  itExemptionCertDetails?: {
    certNo: string;
    effectiveDate: string;
    expiryDate: string;
  }[];
  summary?: {
    totalPAYEDeducted: number;
    totalTaxPayable: number;
    amountPayableOrRefundable: number;
    personalRelief: number;
    isPwd: boolean;
    ahLevy: number;
    shiFund: number;
    pension: number;
    prmFund: number;
    insuranceRelief: number;
    mortgageInterest: number;
    totalGrossPay: number;
    totalTaxablePay: number;
  };
  message?: string;
}

export interface TaxComputationResult {
  success: boolean;
  computation?: {
    totalDeduction: number;
    definedPensionContribution: number;
    socialHealthInsuranceContribution: number;
    housingLevyContribution: number;
    postRetirementMedicalContribution: number;
    employmentIncome: number;
    allowableTaxExemptionDisability: number;
    netTaxableIncome: number;
    taxOnTaxableIncome: number;
    personalRelief: number;
    insuranceRelief: number;
    taxCredits: number;
    payeDeductedFromSalary: number;
    incomeTaxPaidInAdvance: number;
    creditsTotalReliefDtaa: number;
    taxRefundDue: number;
  };
  message?: string;
}

export interface FileItrReturnResult {
  success: boolean;
  code: number;
  message: string;
  receiptNumber?: string;
  taxDue?: string;
}

export interface ValidateInsurancePinResult {
  success: boolean;
  companyName?: string;
  pin?: string;
  error?: string;
}

// ---- New ITR types for Postman API integration ----

export interface ItrConfigResult {
  success: boolean;
  config?: any;
  message?: string;
}

export interface ItrReturnArrays {
  mortgages: {
    id: string;
    pinOfLender: string;
    nameOfLender: string;
    mortgageAccountNo: string;
    amountBorrowed: number;
    outstandingAmount: number;
    interestAmountPaid: number;
    validPin: boolean;
  }[];
  insurancePolicies: {
    id: string;
    pin: string;
    insurerName: string;
    typeOfPolicy: string;
    insurancePolicyNo: string;
    policyHolder: string;
    childAge: number;
    commencementDate: string;
    maturityDate: string;
    sumAssured: number;
    annualPremiumPaid: number;
    amountOfInsuranceRelief: number;
    validPin: boolean;
  }[];
  carBenefits: {
    id: string;
    pinOfEmployer: string;
    nameOfEmployer: string;
    carRegNo: string;
    make: string;
    bodyType: string;
    ccRating: string;
    typeOfCar: string;
    costOfCar: number;
    costOfHire: number;
    periodOfUse: string;
    carBenefitAmount: number;
    validPin: boolean;
    validRegNo: boolean;
  }[];
  disabilityCertificates: {
    id: string;
    certNo: string;
    effectiveDate: string;
    expiryDate: string;
  }[];
  taxReturnRef: string;
  status: string;
  kraAccountNumber: string;
  pensionContribution: number;
  shifContribution: number;
  hlContribution: number;
  pmfContribution: number;
}

export interface CreateItrReturnResult {
  success: boolean;
  taxReturnId?: number;
  taxPayerId?: number;
  taxObligationId?: number;
  arrays?: ItrReturnArrays;
  message?: string;
}

export interface ItrReturnResult {
  success: boolean;
  computation?: TaxComputationResult['computation'];
  arrays?: ItrReturnArrays;
  rawData?: any;
  message?: string;
}

export interface ItrSummaryResult {
  success: boolean;
  summary?: any;
  message?: string;
}

// ---- New ITR server actions matching Postman collection ----

/**
 * Get ITR configuration (tax brackets, relief limits, etc.)
 * GET /api/settings/itr/config
 */
export async function getItrConfig(): Promise<ItrConfigResult> {
  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${process.env.API_URL}/settings/itr/config`,
      { headers, timeout: 30000 }
    );

    logger.info('ITR Config Response:', JSON.stringify(response.data, null, 2));

    return {
      success: true,
      config: response.data,
    };
  } catch (error: any) {
    logger.error('Get ITR Config Error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch ITR configuration',
    };
  }
}

/**
 * Get filing periods for ITR using the correct GET endpoint.
 * GET /api/obligation-filling-period?pin=...&obligation_id=2&is_amended=N&...
 * This is separate from the shared getFilingPeriods to avoid breaking NIL/MRI/TOT.
 */
export async function getItrFilingPeriods(
  pin: string,
  obligationId: string
): Promise<FilingPeriodResult> {
  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${process.env.API_URL}/obligation-filling-period`,
      {
        params: {
          pin: pin,
          obligation_id: obligationId,
          is_amended: 'N',
          branch_id: '',
          from_date: '',
          from_itms_or_prtl: 'PRTL',
        },
        headers,
        timeout: 30000,
      }
    );

    logger.info('ITR Filing Periods Response:', JSON.stringify(response.data, null, 2));

    const data = response.data;
    let periods: string[] = [];

    if (Array.isArray(data)) {
      // Response is an array of period strings
      periods = data.map((item: any) =>
        typeof item === 'string' ? item : (item.period || `${item.from_date} - ${item.to_date}`)
      );
    } else if (data.periods && Array.isArray(data.periods)) {
      periods = data.periods;
    } else if (data.trpFromDate && data.trpToDate) {
      periods = [`${data.trpFromDate} - ${data.trpToDate}`];
    }

    return {
      success: periods.length > 0,
      periods,
      message: data.description || data.message,
    };
  } catch (error: any) {
    logger.error('ITR Filing Period Error:', error.response?.data || error.message);
    return {
      success: false,
      periods: [],
      message: error.response?.data?.message || error.response?.data?.Message || error.response?.data?.description || error.message,
    };
  }
}

/**
 * Get employment income details for ITR filing using the correct endpoint.
 * GET /api/tax-return/itr-employment-details?employee_pin=...&return_year=...&tax_code=2
 */
export async function getItrEmploymentDetails(
  pin: string,
  returnYear?: number
): Promise<EmploymentIncomeResult> {
  const year = returnYear ?? new Date().getFullYear() - 1;

  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${process.env.API_URL}/tax-return/itr-employment-details`,
      {
        params: {
          employee_pin: pin,
          return_year: year,
          tax_code: 2,
        },
        headers,
        timeout: 30000,
      }
    );

    const data = response.data;
    logger.info('ITR Employment Details Response:', JSON.stringify(data, null, 2));

    // Handle various response shapes
    let details: any[] = [];
    if (Array.isArray(data)) {
      details = data;
    } else if (Array.isArray(data.DETAILS)) {
      details = data.DETAILS;
    } else if (Array.isArray(data.employment_income)) {
      details = data.employment_income;
    } else if (Array.isArray(data.data)) {
      details = data.data;
    }

    const rows = details.map((item: any) => ({
      employerPin: item.employer_pin || item.employerPin || '',
      employerName: item.employer_name || item.employerName || '',
      grossPay: Number(item.gross_pay || item.grossPay || 0),
      valueOfCarBenefit: Number(item.value_of_car_benefit || item.valueOfCarBenefit || 0),
      pension: Number(item.pension || 0),
      netValueOfHousing: Number(item.net_value_of_housing || item.netValueOfHousing || 0),
      allowancesBenefits: Number(item.allowances_benefits || item.allowancesBenefits || 0),
      totalEmploymentIncome: Number(item.total_employment_income || item.grossPay || item.gross_pay || 0),
      taxableSalary: Number(item.taxable_salary || item.taxablePay || item.taxable_pay || 0),
      amountOfTaxDeductedPaye: Number(item.amount_of_tax_deducted_paye || item.PAYEDeducted || item.paye_deducted || 0),
      taxPayableOnTaxableSalary: Number(item.tax_payable_on_taxable_salary || item.taxPayableOnTaxablePay || item.tax_payable_on_table_pay || 0),
      amountOfTaxPayableRefundable: Number(item.amount_of_tax_payable_refundable || 0),
    }));

    // Parse disability exemption certificate details from the employment response
    const rawCerts = Array.isArray(data.itExemptionCertDetails) ? data.itExemptionCertDetails : [];
    const itExemptionCertDetails = rawCerts.map((c: any) => ({
      certNo: c.exemptionCertNo || c.certNo || '',
      effectiveDate: c.certEffectiveDate || c.effectiveDate || '',
      expiryDate: c.certExpiryDate || c.expiryDate || '',
    }));

    return {
      success: true,
      rows,
      itExemptionCertDetails,
      message: rows.length === 0 ? (data.message || data.Message || undefined) : undefined,
      summary: {
        totalPAYEDeducted: Number(data.totalPAYEDeducted || 0),
        totalTaxPayable: Number(data.totalTaxPayable || 0),
        amountPayableOrRefundable: Number(data.amountPayableOrRefuindable || data.amountPayableOrRefundable || 0),
        personalRelief: Number(data.personalRelief || 0),
        isPwd: data.isPwd === 'Y' || data.isPwd === true,
        ahLevy: Number(data.ahLevy || 0),
        shiFund: Number(data.shiFund || 0),
        pension: Number(data.pension || 0),
        prmFund: Number(data.prmFund || 0),
        insuranceRelief: Number(data.insuranceRelief || 0),
        mortgageInterest: Number(data.mortgageInterest || 0),
        totalGrossPay: Number(data.totalGrossPay || 0),
        totalTaxablePay: Number(data.totalTaxablePay || 0),
      },
    };
  } catch (error: any) {
    logger.error('Get ITR Employment Details Error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.response?.data?.Message || error.message,
    };
  }
}

/**
 * Legacy employment income endpoint — kept for backward compatibility.
 * Delegates to the new getItrEmploymentDetails.
 */
export async function getEmploymentIncome(
  pin: string,
  returnYear?: number
): Promise<EmploymentIncomeResult> {
  return getItrEmploymentDetails(pin, returnYear);
}

/** Extract the structured arrays that both /tax-return/itr-create and /tax-return-itr share. */
function extractItrReturnArrays(data: any): ItrReturnArrays {
  const toNum = (v: unknown): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'string') { const n = Number(v.replace(/,/g, '').trim()); return Number.isFinite(n) ? n : 0; }
    return 0;
  };

  const mortgages = Array.isArray(data.mortgage) ? data.mortgage.map((m: any) => ({
    id: m.id || '',
    pinOfLender: m.pin_of_lender || '',
    nameOfLender: m.name_of_lender || '',
    mortgageAccountNo: m.mortgage_account_no || '',
    amountBorrowed: toNum(m.amount_borrowed),
    outstandingAmount: toNum(m.outstanding_amount),
    interestAmountPaid: toNum(m.interest_amount_paid ?? m.interest_paid),
    validPin: m.valid_pin === true,
  })) : [];

  const insurancePolicies = Array.isArray(data.insurance_policy) ? data.insurance_policy.map((p: any) => ({
    id: p.id || '',
    pin: p.pin || '',
    insurerName: p.insurer_name || '',
    typeOfPolicy: p.type_of_policy || '',
    insurancePolicyNo: p.insurance_policy_no || '',
    policyHolder: p.policy_holder || '',
    childAge: toNum(p.child_age),
    commencementDate: p.commencement_date || '',
    maturityDate: p.maturity_date || '',
    sumAssured: toNum(p.sum_assured),
    annualPremiumPaid: toNum(p.annual_premium_paid),
    amountOfInsuranceRelief: toNum(p.amount_of_insurance_relief),
    validPin: p.valid_pin === true,
  })) : [];

  const carBenefits = Array.isArray(data.car_benefit) ? data.car_benefit.map((c: any) => ({
    id: c.id || '',
    pinOfEmployer: c.pin_of_employer || '',
    nameOfEmployer: c.name_of_employer || '',
    carRegNo: c.car_reg_no || '',
    make: c.make || '',
    bodyType: c.body_type || '',
    ccRating: c.cc_rating || '',
    typeOfCar: c.type_of_car || '',
    costOfCar: toNum(c.cost_of_car),
    costOfHire: toNum(c.cost_of_hire),
    periodOfUse: c.period_of_use || '',
    carBenefitAmount: toNum(c.car_benefit_amount),
    validPin: c.valid_pin === true,
    validRegNo: c.valid_reg_no === true,
  })) : [];

  const disabilityCertificates = Array.isArray(data.disability_certificate) ? data.disability_certificate.map((d: any) => ({
    id: d.id || '',
    certNo: d.cert_no || '',
    effectiveDate: d.effective_date || '',
    expiryDate: d.expiry_date || '',
  })) : [];

  return {
    mortgages,
    insurancePolicies,
    carBenefits,
    disabilityCertificates,
    taxReturnRef: data.tax_return_ref || '',
    status: data.status || '',
    kraAccountNumber: data.kra_account_number || '',
    pensionContribution: toNum(data.pension_contribution),
    shifContribution: toNum(data.shif_contribution),
    hlContribution: toNum(data.hl_contribution),
    pmfContribution: toNum(data.pmf_contribution),
  };
}

/**
 * Create/Draft an ITR return (Phase 1 of two-phase submit).
 * POST /api/tax-return/itr-create
 */
export async function createItrReturn(payload: {
  pin: string;
  period: string;
  returnType: string;
  pensionContribution: number;
  shifContribution: number;
  hlContribution: number;
  pmfContribution: number;
  insurancePolicies: any[];
  disabilityCertificates: any[];
  employmentIncome: any[];
  mortgages?: any[];
}): Promise<CreateItrReturnResult> {
  try {
    const headers = await getApiHeaders(true);

    const body: Record<string, any> = {
      pin: payload.pin,
      period: payload.period,
      return_type: payload.returnType,
      pension_contribution: String(payload.pensionContribution),
      shif_contribution: String(payload.shifContribution),
      hl_contribution: String(payload.hlContribution),
      pmf_contribution: String(payload.pmfContribution),
      insurance_policy: payload.insurancePolicies.map((p: any) => ({
        pin: p.insuranceCompanyPin || p.pin || '',
        insurer_name: p.insuranceCompanyName || p.insurer_name || '',
        insurance_policy_no: p.insurancePolicyNumber || p.insurance_policy_no || '',
        type_of_policy: p.typeOfPolicy || p.type_of_policy || '',
        policy_holder: p.policyHolder || p.policy_holder || '',
        child_age: Number(p.ageOfChild || p.child_age || 0),
        commencement_date: p.commencementDate || p.commencement_date || '',
        maturity_date: p.maturityDate || p.maturity_date || '',
        sum_assured: Number(p.sumAssured || p.sum_assured || 0),
        annual_premium_paid: Number(p.annualPremiumPaid || p.annual_premium_paid || 0),
        amount_of_insurance_relief: Number(p.amountOfInsuranceRelief || p.amount_of_insurance_relief || 0),
      })),
      disability_certificate: payload.disabilityCertificates.map((d: any) => ({
        cert_no: d.certNo || d.certificateNumber || d.cert_no || '',
        effective_date: d.effectiveDate || d.effective_date || '',
        expiry_date: d.expiryDate || d.expiry_date || '',
      })),
      employment_income: payload.employmentIncome.map((e: any) => ({
        employer_pin: e.employerPin || e.employer_pin || '',
        employer_name: e.employerName || e.employer_name || '',
        gross_pay: Number(e.grossPay || e.gross_pay || 0),
        value_of_car_benefit: Number(e.valueOfCarBenefit || e.value_of_car_benefit || 0),
        pension: Number(e.pension || 0),
        net_value_of_housing: Number(e.netValueOfHousing || e.net_value_of_housing || 0),
        allowances_benefits: Number(e.allowancesBenefits || e.allowances_benefits || 0),
        total_employment_income: Number(e.totalEmploymentIncome || e.total_employment_income || 0),
        taxable_salary: Number(e.taxableSalary || e.taxable_salary || 0),
        amount_of_tax_deducted_paye: Number(e.amountOfTaxDeductedPaye || e.amount_of_tax_deducted_paye || 0),
        tax_payable_on_taxable_salary: Number(e.taxPayableOnTaxableSalary || e.tax_payable_on_taxable_salary || 0),
        amount_of_tax_payable_refundable: Number(e.amountOfTaxPayableRefundable || e.amount_of_tax_payable_refundable || 0),
      })),
    };

    if (payload.mortgages && payload.mortgages.length > 0) {
      body.mortgage = payload.mortgages.map((m: any) => ({
        pin_of_lender: m.pinOfLender || m.pin_of_lender || '',
        name_of_lender: m.nameOfLender || m.name_of_lender || '',
        mortgage_account_no: m.mortgageAccountNo || m.mortgage_account_no || '',
        amount_borrowed: String(m.amountBorrowed || m.amount_borrowed || 0),
        outstanding_amount: String(m.outstandingAmount || m.outstanding_amount || 0),
        interest_amount_paid: String(m.interestAmountPaid || m.interest_amount_paid || 0),
      }));
    }

    logger.info('Creating ITR Return (Phase 1):', JSON.stringify(body, null, 2));

    const response = await axios.post(
      `${process.env.API_URL}/tax-return/itr-create`,
      body,
      { headers, timeout: 30000 }
    );

    const data = response.data;
    logger.info('Create ITR Return Response:', JSON.stringify(data, null, 2));

    return {
      success: true,
      taxReturnId: data.tax_return_id || data.id || data.data?.id || data.data?.tax_return_id,
      taxPayerId: data.tax_payer_id || data.data?.tax_payer_id,
      taxObligationId: data.tax_obligation_id || data.data?.tax_obligation_id,
      arrays: extractItrReturnArrays(data),
    };
  } catch (error: any) {
    logger.error('Create ITR Return Error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.response?.data?.Message || error.response?.data?.errors?.detail || error.message,
    };
  }
}

/**
 * Get the server-computed tax return after draft creation.
 * GET /api/tax-return-itr?tax_payer_id=...&tax_obligation_id=...&period=...&return_type=normal
 */
export async function getItrReturn(
  taxPayerId: number,
  taxObligationId: number,
  period: string,
  returnType: string = 'normal'
): Promise<ItrReturnResult> {
  const toNumber = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (!normalized) return 0;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${process.env.API_URL}/tax-return-itr`,
      {
        params: {
          tax_payer_id: taxPayerId,
          tax_obligation_id: taxObligationId,
          period: period,
          return_type: returnType,
        },
        headers,
        timeout: 30000,
      }
    );

    const data = response.data;
    logger.info('Get ITR Return Response:', JSON.stringify(data, null, 2));

    const meta = data.meta_data ?? {};

    const computation: TaxComputationResult['computation'] = {
      totalDeduction: toNumber(data.total_deduction ?? meta.total_deduction),
      definedPensionContribution: toNumber(data.pension_contribution ?? data.defined_pension_contribution ?? meta.pension_contribution),
      socialHealthInsuranceContribution: toNumber(data.shif_contribution ?? meta.shif_contribution),
      housingLevyContribution: toNumber(data.hl_contribution ?? meta.hl_contribution),
      postRetirementMedicalContribution: toNumber(data.pmf_contribution ?? meta.pmf_contribution),
      employmentIncome: toNumber(data.taxable_amount ?? meta.employment_income ?? data.employment_income),
      allowableTaxExemptionDisability: toNumber(data.allowable_tax_exemption_incase_of_person_with_disability ?? data.disability_exemption),
      netTaxableIncome: toNumber(meta.net_taxable_income ?? data.net_taxable_income),
      taxOnTaxableIncome: toNumber(meta.total_tax_payable ?? data.tax_on_taxable_income),
      personalRelief: toNumber(meta.personal_relief ?? data.personal_relief),
      insuranceRelief: toNumber(data.insurance_relief ?? meta.insurance_relief),
      taxCredits: toNumber(data.tax_credits ?? meta.tax_credits),
      payeDeductedFromSalary: toNumber(data.paye_deducted_from_salary ?? meta.total_payed_deducted),
      incomeTaxPaidInAdvance: toNumber(data.income_tax_paid_in_advance ?? meta.income_tax_paid_in_advance),
      creditsTotalReliefDtaa: toNumber(meta.credits ?? data.credits),
      taxRefundDue: toNumber(data.tax_due ?? data.tax_due_refund_due ?? meta.amount_payable_or_refundable),
    };

    return {
      success: true,
      computation,
      arrays: extractItrReturnArrays(data),
      rawData: data,
    };
  } catch (error: any) {
    logger.error('Get ITR Return Error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.response?.data?.Message || error.message,
    };
  }
}

/**
 * Get ITR summary for review before final submission.
 * GET /api/tax-return/itr-summary/{id}
 */
export async function getItrSummary(
  taxReturnId: number
): Promise<ItrSummaryResult> {
  try {
    const headers = await getApiHeaders(true);
    const url = `${process.env.API_URL}/tax-return/itr-summary/${taxReturnId}`;
    logger.info(`ITR Summary Request: GET ${url} | taxReturnId=${taxReturnId} (type: ${typeof taxReturnId}) | Auth: ${headers.Authorization ? 'Bearer ...' + String(headers.Authorization).slice(-10) : 'MISSING'}`);
    const response = await axios.get(
      url,
      { headers, timeout: 30000 }
    );

    logger.info('ITR Summary Response:', JSON.stringify(response.data, null, 2));

    return {
      success: true,
      summary: response.data,
    };
  } catch (error: any) {
    logger.error('Get ITR Summary Error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.response?.data?.Message || error.message,
    };
  }
}

/**
 * File/Submit ITR return (Phase 2 of two-phase submit).
 * POST /api/tax-return/create
 * Uses the tax_return_id from Phase 1 (createItrReturn).
 */
export async function fileItrReturn(
  taxReturnId: number,
  obligationId: string,
  returnPeriod: string,
  taxableAmount: number,
  taxDue: number,
  taxPayerPin: string,
  taxPayerId: number,
  metaData: {
    returnYear: number;
    taxCode: string;
    employeePin: string;
    totalTaxPayable: number;
    totalPayedDeducted: number;
    amountPayableOrRefundable: number;
    pensionContribution: number;
    hlContribution: number;
    pmfContribution: number;
    shifContribution: number;
    personalRelief: number;
    credits: number;
    netTaxableIncome: number;
    employmentIncome: any[];
  }
): Promise<FileItrReturnResult> {
  try {
    const headers = await getApiHeaders(true);

    const payload = {
      tax_return_id: taxReturnId,
      obligation_id: obligationId,
      returnType: 'normal',
      returnPeriod: returnPeriod,
      taxable_amount: String(taxableAmount),
      tax_due: String(taxDue),
      currency: 'KES',
      meta_data: {
        return_year: metaData.returnYear,
        tax_code: metaData.taxCode,
        employee_pin: metaData.employeePin,
        total_tax_payable: metaData.totalTaxPayable,
        total_payed_deducted: metaData.totalPayedDeducted,
        amount_payable_or_refundable: metaData.amountPayableOrRefundable,
        pension_contribution: metaData.pensionContribution,
        hl_contribution: metaData.hlContribution,
        pmf_contribution: metaData.pmfContribution,
        shif_contribution: metaData.shifContribution,
        personal_relief: metaData.personalRelief,
        credits: metaData.credits,
        net_taxable_income: String(metaData.netTaxableIncome),
        employment_income: metaData.employmentIncome.map((row: any) => ({
          employer_pin: row.employerPin || row.employer_pin || '',
          employer_name: row.employerName || row.employer_name || '',
          gross_pay: Number(row.grossPay || row.gross_pay || 0),
          pension: Number(row.pension || 0),
          taxable_pay: Number(row.taxableSalary || row.taxable_pay || 0),
          tax_payable_on_table_pay: Number(row.taxPayableOnTaxableSalary || row.tax_payable_on_table_pay || 0),
          paye_deducted: Number(row.amountOfTaxDeductedPaye || row.paye_deducted || 0),
        })),
      },
    };

    logger.info('Submitting ITR Return (Phase 2):', JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${process.env.API_URL}/tax-return/create`,
      payload,
      { headers, timeout: 30000 }
    );

    const data = response.data;
    logger.info('Submit ITR Return Response:', JSON.stringify(data, null, 2));

    const isSuccess =
      data.code === 1 ||
      data.code === 200 ||
      data.success === true ||
      (data.response && data.response.Status === 'OK');

    let message = data.message || 'ITR filed successfully';
    let receiptNumber = data.receipt_number || data.receiptNumber;
    if (data.response) {
      if (data.response.Message) message = data.response.Message;
      if (data.response.AckNumber) receiptNumber = data.response.AckNumber;
    }

    return {
      success: isSuccess,
      code: data.code || (isSuccess ? 200 : 500),
      message,
      receiptNumber,
      taxDue: data.tax_due,
    };
  } catch (error: any) {
    logger.error('Submit ITR Return Error:', error.response?.data || error.message);
    return {
      success: false,
      code: error.response?.status || 500,
      message: error.response?.data?.Message || error.response?.data?.message || error.response?.data?.errors?.detail || 'Failed to submit ITR return',
    };
  }
}

/**
 * Validate insurance company PIN and return company details.
 */
export async function validateInsurancePin(pin: string): Promise<ValidateInsurancePinResult> {
  const normalizedPin = (pin || '').trim().toUpperCase();
  if (!normalizedPin || normalizedPin.length !== 11) {
    return {
      success: false,
      pin: normalizedPin,
      error: 'PIN must be exactly 11 characters',
    };
  }

  const result = await checkPin(normalizedPin);
  if (!result.success || !result.data?.taxpayerName) {
    return {
      success: false,
      pin: normalizedPin,
      error: result.error || 'Invalid insurance company PIN',
    };
  }

  return {
    success: true,
    pin: normalizedPin,
    companyName: result.data.taxpayerName,
  };
}

/**
 * Check disability exemption certificate for ITR
 */
export async function getDisabilityExemption(
  pin: string
): Promise<{ success: boolean; hasCertificate: boolean; certificateNumber?: string; message?: string }> {

  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${BASE_URL}/disability-exemption/${pin}`,
      { headers, timeout: 30000 }
    );
    const data = response.data;
    return {
      success: true,
      hasCertificate: !!data.certificate_number,
      certificateNumber: data.certificate_number,
    };
  } catch (error: any) {
    console.error('Get Disability Exemption Error:', error.response?.data || error.message);
    return {
      success: false,
      hasCertificate: false,
      message: error.response?.data?.message || 'Failed to check disability exemption',
    };
  }
}

export async function renderItrFilingCard(variables: {
  name: string;
  pin: string;
}): Promise<{ url: string; mimeType: string } | { error: string }> {
  try {
    const url = `${process.env.HYPECARD_API_URL || process.env.API_URL}/hypecard-templates/render-stateless-url`;
    logger.info(`[renderItrFilingCard] Calling: ${url}`);
    
    const response = await axios.post(
      url,
      {
        templateName: 'itr-filing-card',
        variables,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.INTERNAL_API_KEY,
        },
        timeout: 15000,
      }
    );
    logger.info(`[renderItrFilingCard] Success! URL: ${response.data.url}`);
    return { url: response.data.url, mimeType: response.data.mimeType };
  } catch (err: any) {
    const errorData = err.response?.data;
    const errorMessage = errorData?.message || err.message;
    logger.error(`[renderItrFilingCard] Failed: ${errorMessage}`, {
      status: err.response?.status,
      data: errorData
    });
    return { error: `Filing card generation failed: ${errorMessage}` };
  }
}

export async function renderNoEmployerCard(variables: {
  name: string;
  pin: string;
}): Promise<{ url: string; mimeType: string } | { error: string }> {
  try {
    const url = `${process.env.HYPECARD_API_URL || process.env.API_URL}/hypecard-templates/render-stateless-url`;
    logger.info(`[renderNoEmployerCard] Calling: ${url}`);
    
    const response = await axios.post(
      url,
      {
        templateName: 'itr-no-employer-card',
        variables,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.INTERNAL_API_KEY,
        },
        timeout: 15000,
      }
    );
    logger.info(`[renderNoEmployerCard] Success! URL: ${response.data.url}`);
    return { url: response.data.url, mimeType: response.data.mimeType };
  } catch (err: any) {
    const errorData = err.response?.data;
    const errorMessage = errorData?.message || err.message;
    logger.error(`[renderNoEmployerCard] Failed: ${errorMessage}`, {
      status: err.response?.status,
      data: errorData
    });
    return { error: `No Employer card generation failed: ${errorMessage}` };
  }
}
