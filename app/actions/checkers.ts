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

const BASE_URL = 'https://kratest.pesaflow.com/api';

// ============= Types =============

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

// PIN Checker Result
export interface PinCheckerResult {
  success: boolean;
  error?: string;
  data?: {
    taxpayerName: string;
    pin: string;
    station: string;
  };
}

// Staff Checker Result
export interface StaffCheckerResult {
  success: boolean;
  error?: string;
  data?: {
    otherNames: string;
    surname: string;
    idNumber: string;
    regionName: string;
    deptName: string;
    status: string;
  };
}

// TCC Checker Result
export interface TccCheckerResult {
  success: boolean;
  error?: string;
  data?: {
    kraPin: string;
    tccExpiryDate: string;
    tccIssueDate: string;
    tccNo: string;
    tccStatus: string;
  };
}

// Import Certificate Checker Result
export interface ImportCertCheckerResult {
  success: boolean;
  error?: string;
  data?: {
    certificateNo: string;
    issueDate: string;
    status: string;
  };
}

// Invoice Checker Result
export interface InvoiceCheckerResult {
  success: boolean;
  error?: string;
  data?: {
    invoiceNumber: string;
    salesDate: string;
    supplierName: string;
    totalInvoiceAmount: string;
    totalTaxableAmount: string;
    totalTaxAmount: string;
  };
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

// ============= Init Session =============

import { cleanPhoneNumber } from '../_lib/utils';

/**
 * Initialize session with the API (required before checker calls)
 */
export async function initSession(msisdn: string): Promise<{ success: boolean; error?: string }> {
  const cleanNumber = cleanPhoneNumber(msisdn);

  try {
    const headers = await getApiHeaders(true);
    await axios.post(
      `${BASE_URL}/ussd/init`,
      { msisdn: cleanNumber },
      { headers, timeout: 30000 }
    );
    return { success: true };
  } catch (error: any) {
    console.error('Init session error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to initialize session' 
    };
  }
}

// ============= Checker APIs =============

/**
 * PIN Checker - Validate a KRA PIN and get taxpayer details
 */
export async function checkPin(pinNumber: string): Promise<PinCheckerResult> {
  if (!pinNumber || pinNumber.length !== 11) {
    return { success: false, error: 'PIN must be exactly 11 characters' };
  }

  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${BASE_URL}/taxpayer/pin-checker`,
      { 
        headers, 
        params: { pin_number: pinNumber.toUpperCase() },
        timeout: 30000 
      }
    );

    console.log('PIN Checker response:', JSON.stringify(response.data, null, 2));

    const result = response.data;
    
    if (result && result.TaxpayerName) {
      return {
        success: true,
        data: {
          taxpayerName: result.TaxpayerName,
          pin: result.pin || pinNumber,
          station: result.Station || 'N/A'
        }
      };
    } else {
      return { 
        success: false, 
        error: result.message || 'Invalid PIN or taxpayer not found' 
      };
    }
  } catch (error: any) {
    console.error('PIN Checker error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to check PIN' 
    };
  }
}

/**
 * Staff Checker - Validate KRA staff by National ID
 */
export async function checkStaff(nationalId: string): Promise<StaffCheckerResult> {
  if (!nationalId || nationalId.length < 6) {
    return { success: false, error: 'National ID must be at least 6 digits' };
  }

  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${BASE_URL}/taxpayer/staff-checker`,
      { 
        headers, 
        params: { national_id: nationalId },
        timeout: 30000 
      }
    );

    console.log('Staff Checker response:', JSON.stringify(response.data, null, 2));

    const result = response.data;
    
    if (result && result.OTHERNAMES) {
      return {
        success: true,
        data: {
          otherNames: result.OTHERNAMES,
          surname: result.SURNAME,
          idNumber: result.IDNUMBER,
          regionName: result.REGIONNAME,
          deptName: result.DEPTNAME,
          status: result.STATUS
        }
      };
    } else {
      return { 
        success: false, 
        error: result.message || 'Staff not found' 
      };
    }
  } catch (error: any) {
    console.error('Staff Checker error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to check staff' 
    };
  }
}

/**
 * TCC Checker - Validate Tax Compliance Certificate
 */
export async function checkTcc(kraPin: string, tccNumber: string): Promise<TccCheckerResult> {
  if (!kraPin || kraPin.length !== 11) {
    return { success: false, error: 'KRA PIN must be exactly 11 characters' };
  }
  if (!tccNumber) {
    return { success: false, error: 'TCC Number is required' };
  }

  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${BASE_URL}/itax/validate-tcc`,
      { 
        headers, 
        params: { kra_pin: kraPin.toUpperCase(), tcc_number: tccNumber },
        timeout: 30000 
      }
    );

    console.log('TCC Checker response:', JSON.stringify(response.data, null, 2));

    const result = response.data;
    
    if (result && result.TCCDATA) {
      const tccData = result.TCCDATA;
      return {
        success: true,
        data: {
          kraPin: tccData.kraPin,
          tccExpiryDate: tccData.tccExpiryDate,
          tccIssueDate: tccData.tccIssueDate,
          tccNo: tccData.tccNo,
          tccStatus: tccData.tccStatus
        }
      };
    } else {
      return { 
        success: false, 
        error: result.message || 'TCC not found or invalid' 
      };
    }
  } catch (error: any) {
    console.error('TCC Checker error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to check TCC' 
    };
  }
}

/**
 * Import Certificate Checker - Validate import certificate
 */
export async function checkImportCertificate(certificateNo: string): Promise<ImportCertCheckerResult> {
  if (!certificateNo) {
    return { success: false, error: 'Certificate number is required' };
  }

  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${BASE_URL}/taxpayer/import-certificate`,
      { 
        headers, 
        params: { certificate_no: certificateNo },
        timeout: 30000 
      }
    );

    console.log('Import Certificate response:', JSON.stringify(response.data, null, 2));

    const result = response.data;
    
    if (result && result.importCertificate_Dtls?.importCertDtls?.[0]) {
      const certData = result.importCertificate_Dtls.importCertDtls[0];
      return {
        success: true,
        data: {
          certificateNo: certData.certiNo,
          issueDate: certData.issueDt,
          status: certData.statusFlag
        }
      };
    } else {
      return { 
        success: false, 
        error: result.message || 'Import certificate not found' 
      };
    }
  } catch (error: any) {
    console.error('Import Certificate error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to check import certificate' 
    };
  }
}

/**
 * Invoice Number Checker - Validate invoice number
 */
export async function checkInvoice(invoiceNumber: string): Promise<InvoiceCheckerResult> {
  if (!invoiceNumber) {
    return { success: false, error: 'Invoice number is required' };
  }

  try {
    const headers = await getApiHeaders(true);
    const response = await axios.get(
      `${BASE_URL}/invoice-number-checker`,
      { 
        headers, 
        params: { invoice_number: invoiceNumber },
        timeout: 30000 
      }
    );

    console.log('Invoice Checker response:', JSON.stringify(response.data, null, 2));

    const result = response.data;
    
    if (result && result.data) {
      const invoiceData = result.data;
      return {
        success: true,
        data: {
          invoiceNumber: invoiceData.controlUnitInvoiceNumber,
          salesDate: invoiceData.salesDate,
          supplierName: invoiceData.supplierName,
          totalInvoiceAmount: invoiceData.totalInvoiceAmount,
          totalTaxableAmount: invoiceData.totalTaxableAmount,
          totalTaxAmount: invoiceData.totalTaxAmount
        }
      };
    } else {
      return { 
        success: false, 
        error: result.message || 'Invoice not found' 
      };
    }
  } catch (error: any) {
    console.error('Invoice Checker error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to check invoice' 
    };
  }
}
