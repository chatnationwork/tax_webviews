'use server';

import axios from 'axios';
import {
  CustomerLookupResult,
  InvoiceSubmissionRequest,
  InvoiceSubmissionResult,
  FetchInvoicesResult,
  SearchCreditNoteResult,
  CreditNoteInvoice,
  SubmitCreditNoteRequest,
  SubmitCreditNoteResult,
  FetchedInvoice,
  SubmitBuyerInitiatedInvoiceRequest,
  SubmitBuyerInitiatedInvoiceResult
} from '../etims/_lib/definitions';

const BASE_URL = 'https://kratest.pesaflow.com/api/ussd';

// Helper to handle API errors - logs detailed error on server, returns friendly message string
const getApiErrorMessage = (error: any, context: string = 'API'): string => {
  // Log detailed error for debugging (server-side only)
  console.error(`[${context}] API Error:`, {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message,
    url: error.config?.url,
  });
  
  // Try to extract specific error message from API response
  const apiMessage = error.response?.data?.message || error.response?.data?.error;
  if (apiMessage && typeof apiMessage === 'string') {
    return apiMessage;
  }
  
  // Return user-friendly error message based on status
  const status = error.response?.status;
  
  if (status === 401 || status === 403) {
    return 'Session expired. Please login again.';
  } else if (status === 404) {
    return 'Service temporarily unavailable. Please try again later.';
  } else if (status === 400) {
    return 'Invalid request. Please check your input and try again.';
  } else if (status === 500 || status === 502 || status === 503) {
    return 'Service temporarily unavailable. Please try again later.';
  } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'Request timed out. Please check your connection and try again.';
  } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return 'Cannot connect to server. Please try again later.';
  } else {
    return 'Unable to complete request. Please try again.';
  }
};

/**
 * Lookup customer by PIN or ID
 */
export async function lookupCustomer(pinOrId: string): Promise<CustomerLookupResult> {
  if (!pinOrId || pinOrId.trim() === '') {
    return { success: false, error: 'Please enter a PIN or ID number' };
  }

  // Validate PIN/ID format (should be alphanumeric)
  if (!/^[A-Za-z0-9]+$/.test(pinOrId.trim())) {
    return { success: false, error: 'Please enter a valid PIN or ID number' };
  }

  console.log('Looking up customer:', pinOrId);

  try {
    const response = await axios.post(
      `${BASE_URL}/buyer-initiated/lookup`,
      {
        pin_or_id: pinOrId.trim()
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('Lookup response:', JSON.stringify(response.data, null, 2));

    // The API returns { code: 3, message: "Valid ID Number", name: "...", pin: "..." } on success
    // It does not return a standard success: boolean flag.
    if (response.data && (response.data.pin || response.data.code === 3)) {
      return {
        success: true,
        customer: {
          name: response.data.name,
          pin: response.data.pin,
          msisdn: response.data.msisdn || '' // msisdn might not be returned in lookup
        }
      };
    } else {
        return {
            success: false,
            error: response.data.message || 'Customer not found'
        };
    }
  } catch (error: any) {
    // Log detailed error on server
    console.error('[Customer Lookup] Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    
    // Return friendly error message
    if (error.response?.status === 404) {
      return {
        success: false,
        error: 'Buyer not found. Please check the PIN/ID and try again.'
      };
    } else if (error.response?.status >= 500) {
      return {
        success: false,
        error: 'Service temporarily unavailable. Please try again later.'
      };
    }
    
    return {
      success: false,
      error: 'Could not verify buyer. Please try again.'
    };
  }
}

/**
 * Submit sales invoice
 */
export async function submitInvoice(
  request: InvoiceSubmissionRequest
): Promise<InvoiceSubmissionResult> {
  // Validate request
  if (!request.msisdn) {
    return { success: false, error: 'Customer phone number is required' };
  }

  if (!request.items || request.items.length === 0) {
    return { success: false, error: 'Please add at least one item to the invoice' };
  }

  if (request.total_amount <= 0) {
    return { success: false, error: 'Total amount must be greater than 0' };
  }

  // Validate each item
  for (const item of request.items) {
    if (!item.item_name || item.item_name.trim() === '') {
      return { success: false, error: 'Item name is required for all items' };
    }
    if (item.taxable_amount <= 0) {
      return { success: false, error: 'Price must be greater than 0 for all items' };
    }
    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      return { success: false, error: 'Quantity must be a positive whole number for all items' };
    }
  }

  console.log('Submitting invoice:', JSON.stringify(request, null, 2));

  try {
    const response = await axios.post(
      `${BASE_URL}/post-sale`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': 'triple_2_ussd'
        },
        timeout: 60000, // 60 second timeout for invoice submission
      }
    );

    console.log('Invoice API Response:', JSON.stringify(response.data, null, 2));

    // API returns code 8 for success
    // Transform to match our InvoiceSubmissionResult interface
    return {
      success: response.data.code === 8,
      invoice_id: response.data.invoice_no,
      message: response.data.message,
      transaction_reference: response.data.invoice_no,
      invoice_pdf_url: response.data.invoice_pdf_url,
      invoice_preview_url: response.data.invoice_preview_url,
      error: response.data.code !== 8 ? response.data.message : undefined
    };
  } catch (error: any) {
    const errorMessage = getApiErrorMessage(error, 'Invoice Submission');
    return { success: false, error: errorMessage };
  }
}

/**
 * Fetch buyer-initiated invoices by phone number
 * @param status - Optional filter: 'pending' | 'rejected' | 'accepted' | 'awaiting_approval'
 * @param actor - Optional filter: 'buyer' | 'supplier' (filters by user's role)
 */
export async function fetchInvoices(
  phoneNumber: string, 
  buyerName?: string, 
  status?: 'pending' | 'rejected' | 'accepted' | 'awaiting_approval',
  actor?: 'buyer' | 'supplier'
): Promise<FetchInvoicesResult> {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return { success: false, invoices: [], error: 'Phone number is required' };
  }

  // Clean phone number - remove any non-numeric characters except leading +
  let cleanNumber = phoneNumber.trim().replace(/[^\d]/g, '');
  
  // Ensure it starts with 254 for Kenya
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '254' + cleanNumber.substring(1);
  } else if (!cleanNumber.startsWith('254')) {
    cleanNumber = '254' + cleanNumber;
  }

  console.log('Fetching invoices for:', cleanNumber, 'status:', status || 'all', 'actor:', actor || 'all');

  try {
    // Build URL with query params
    const params = new URLSearchParams();
    params.append('page', '1');
    params.append('page_size', '50');
    params.append('source', 'whatsapp');
    if (status) params.append('status', status);
    if (actor) params.append('actor', actor);

    const url = `${BASE_URL}/buyer-initiated/fetch/${cleanNumber}?${params.toString()}`;

    const response = await axios.get(
      url,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': 'triple_2_ussd'
        },
        timeout: 30000
      }
    );

    console.log('Fetch invoices response:', JSON.stringify(response.data, null, 2));

    // Handle different response formats
    let invoices: any[] = [];
    if (Array.isArray(response.data)) {
      invoices = response.data;
    } else if (response.data.invoices?.entries) {
      // New paginated format: { invoices: { entries: [...], total_entries: N } }
      invoices = response.data.invoices.entries;
    } else if (response.data.invoices && Array.isArray(response.data.invoices)) {
      invoices = response.data.invoices;
    } else if (response.data.data) {
      invoices = response.data.data;
    } else if (response.data.code === 20) {
      // Code 20 = "Invoices Found" but may have empty entries
      return { success: true, invoices: [] };
    } else if (response.data.success !== false) {
      return { success: true, invoices: [] };
    } else {
      return { success: false, error: response.data.message };
    }

    // Parse invoices if they are strings
    const parsedInvoices: FetchedInvoice[] = invoices.map((inv: any) => {
      if (typeof inv === 'string') {
        // Format: "BI-KWFQOH; KES 3000; KRA TEST USER ITAX"
        // Split by semicolon
        const parts = inv.split(';').map((p: string) => p.trim());
        const reference = parts[0] || 'Unknown';
        
        // Parse amount (remove KES, commas, etc)
        const amountStr = parts[1] || '0';
        const amount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;
        
        const sellerName = parts[2] || 'Unknown Seller';

        return {
          invoice_id: reference,
          reference: reference,
          total_amount: amount,
          status: 'pending', // Default to pending for fetched lists usually
          buyer_name: buyerName || 'Unknown', // Use passed buyer name or default
          seller_name: sellerName,
          created_at: new Date().toISOString(), // Mock date as it's not in the string
          items: [
            {
              item_name: 'Invoice Item(s)',
              quantity: 1,
              unit_price: amount
            }
          ]
        };
      }
      return inv; // Return as is if already object
    });

    return {
      success: true,
      invoices: parsedInvoices
    };
  } catch (error: any) {
    console.error('Fetch invoices error:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      return {
        success: true,
        invoices: []
      };
    }
    const errorMessage = getApiErrorMessage(error, 'Fetch Invoices');
    return { success: false, invoices: [], error: errorMessage };
  }
}

/**
 * Search for invoice to create credit note
 */
export async function searchCreditNoteInvoice(
  msisdn: string,
  invoiceNo: string
): Promise<SearchCreditNoteResult> {
  if (!msisdn || msisdn.trim() === '') {
    return { success: false, error: 'Phone number is required' };
  }

  if (!invoiceNo || invoiceNo.trim() === '') {
    return { success: false, error: 'Invoice number is required' };
  }

  // Clean phone number
  let cleanNumber = msisdn.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '254' + cleanNumber.substring(1);
  } else if (!cleanNumber.startsWith('254')) {
    cleanNumber = '254' + cleanNumber;
  }

  console.log('Searching credit note invoice:', invoiceNo, 'for:', cleanNumber);

  try {
    const response = await axios.post(
      `${BASE_URL}/search/credit-note`,
      {
        msisdn: cleanNumber,
        invoice_no: invoiceNo.trim()
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': 'triple_2_ussd'
        },
        timeout: 30000
      }
    );

    console.log('Search credit note response:', JSON.stringify(response.data, null, 2));

    // Handle response - check if invoice data is in the response
    if (response.data.success === false) {
      return {
        success: false,
        error: response.data.message || 'Invoice not found'
      };
    }

    // Extract invoice details from response
    const invoice: CreditNoteInvoice = {
      invoice_no: response.data.invoice_no || invoiceNo,
      invoice_id: response.data.invoice_id,
      total_amount: response.data.total_amount || response.data.amount || 0,
      currency: response.data.currency || 'KES',
      seller_name: response.data.seller_name,
      buyer_name: response.data.buyer_name,
      items: response.data.items || response.data.line_items || []
    };

    return {
      success: true,
      invoice,
      hasPartialCreditNote: response.data.has_partial_credit_note || false
    };
  } catch (error: any) {
    console.error('Search credit note error:', error.response?.data || error.message);
    
    // Handle specific error codes from API
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message;
    
    if (error.response?.status === 404) {
      return {
        success: false,
        error: 'Invoice not found'
      };
    }
    
    // Code 15 = Credit Note already issued for this invoice
    // The invoice exists, just has a credit note already - return success with flag
    if (errorCode === 15) {
      return {
        success: true,
        hasCreditNote: true,
        invoice: {
          invoice_no: invoiceNo.trim(),
          total_amount: 0, // We don't have the details but the invoice exists
          currency: 'KES',
          items: []
        },
        error: 'A credit note was previously issued for this invoice.'
      };
    }
    
    // Code 13 = Invalid Invoice Number
    if (errorCode === 13) {
      return {
        success: false,
        error: 'Invalid invoice number. Please check and try again.'
      };
    }
    
    // Return error response instead of throwing (to avoid 500s)
    return {
      success: false,
      error: errorMessage || 'Failed to search invoice. Please try again.'
    };
  }
}

/**
 * Submit partial credit note
 * Note: Using mock response until backend is updated with full payload support
 */
export async function submitCreditNote(
  request: SubmitCreditNoteRequest
): Promise<SubmitCreditNoteResult> {
  // Validate request
  if (!request.msisdn) {
    return { success: false, error: 'Phone number is required' };
  }

  if (!request.invoice_no) {
    return { success: false, error: 'Invoice number is required' };
  }

  // and credit note type if partial
  if (request.credit_note_type === 'partial' && (!request.items || request.items.length === 0)) {
    return { success: false, error: 'Please select at least one item' };
  }

  if (request.credit_note_type === "partial"){

     // Validate each item
  for (const item of request.items) {
    if (item.return_quantity <= 0) {
      return { success: false, error: 'Return quantity must be greater than 0' };
    }
  }
  }
 

  // Clean phone number
  let cleanNumber = request.msisdn.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '254' + cleanNumber.substring(1);
  } else if (!cleanNumber.startsWith('254')) {
    cleanNumber = '254' + cleanNumber;
  }

  console.log('Submitting credit note:', JSON.stringify({
    ...request,
    msisdn: cleanNumber
  }, null, 2));

  try {
    const endpoint=`${BASE_URL}/submit/credit-note`
    // Use different endpoints for full vs partial credit notes
   

    console.log('Using endpoint:', endpoint);

    const response = await axios.post(
      endpoint,
      {
        msisdn: cleanNumber,
        invoice_no: request.invoice_no,
        full: request.credit_note_type === 'full',
        reason: request.reason,
        items: request.items
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': 'triple_2_ussd'
        },
        timeout: 30000
      }
    );

    console.log('Submit credit note response:', JSON.stringify(response.data, null, 2));

    // API returns code 12 for success
    return {
      success: response.data.code === 12,
      credit_note_id: response.data.credit_note_id || response.data.credit_note_ref,
      credit_note_ref: response.data.credit_note_ref,
      credit_note_pdf_url: response.data.credit_note_pdf_url,
      message: response.data.message || 'Credit note submitted successfully',
      error: response.data.code !== 12 ? response.data.message : undefined
    };
  } catch (error: any) {
    console.error('Submit credit note error:', error.response?.data || error.message);
    
    // If API doesn't support full payload yet, return mock success
    if (error.response?.status === 400 || error.response?.status === 422) {
      console.log('API may not support full payload, returning mock success');
      return {
        success: false,
   
        message: 'Credit note submission failed '
      };
    }
    
    const errorMessage = getApiErrorMessage(error, 'Submit Credit Note');
    return { success: false, error: errorMessage };
  }
}

/**
 * Process buyer initiated invoice (accept/reject)
 */
export async function processBuyerInvoice(
  msisdn: string,
  invoiceRef: string,
  action: 'accept' | 'reject'
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!msisdn) return { success: false, error: 'Phone number is required' };
  if (!invoiceRef) return { success: false, error: 'Invoice reference is required' };

  let cleanNumber = msisdn.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (!cleanNumber.startsWith('254')) cleanNumber = '254' + cleanNumber;

  console.log(`Processing invoice ${invoiceRef} for ${cleanNumber}: ${action}`);

  try {
    const response = await axios.post(
      `${BASE_URL}/buyer-initiated/action/submit`,
      {
        action,
        msisdn: cleanNumber,
        invoice: invoiceRef
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': 'triple_2_ussd'
        },
        timeout: 30000
      }
    );

    console.log('Process invoice response:', JSON.stringify(response.data, null, 2));

    return {
      success: true,
      message: response.data.message || 'Action submitted successfully'
    };
  } catch (error: any) {
    const errorMessage = getApiErrorMessage(error, 'Process Invoice');
    return { success: false, error: errorMessage };
  }
}

/**
 * Submit buyer initiated invoice (Buyer creates, Seller approves)
 */
export async function submitBuyerInitiatedInvoice(
  request: SubmitBuyerInitiatedInvoiceRequest
): Promise<SubmitBuyerInitiatedInvoiceResult> {
  // Validate request
  if (!request.msisdn) return { success: false, error: 'Buyer phone number is required' };
  if (!request.seller_pin) return { success: false, error: 'Seller PIN is required' };
  if (!request.items || request.items.length === 0) return { success: false, error: 'At least one item is required' };

  let cleanNumber = request.msisdn.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (!cleanNumber.startsWith('254')) cleanNumber = '254' + cleanNumber;

  let cleanSellerNumber = request.seller_msisdn?.trim().replace(/[^\d]/g, '') || '';
  if (cleanSellerNumber.startsWith('0')) cleanSellerNumber = '254' + cleanSellerNumber.substring(1);
  else if (cleanSellerNumber && !cleanSellerNumber.startsWith('254')) cleanSellerNumber = '254' + cleanSellerNumber;

  console.log('Submitting buyer initiated invoice:', JSON.stringify({ ...request, msisdn: cleanNumber }, null, 2));

  try {
    const response = await axios.post(
      `${BASE_URL}/buyer-initiated/submit/invoice`,
      {
        msisdn: cleanNumber,
        seller_pin: request.seller_pin,
        seller_msisdn: cleanSellerNumber || undefined,
        total_amount: request.total_amount,
        items: request.items
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': 'triple_2_ussd'
        },
        timeout: 30000
      }
    );

    console.log('Submit buyer initiated invoice response:', JSON.stringify(response.data, null, 2));

    return {
      success: response.data.success !== false, // Some APIs return success: true/false, others implict success
      invoice_id: response.data.invoice_id || response.data.reference,
      reference: response.data.reference,
      invoice_pdf_url: response.data.invoice_pdf_url,
      message: response.data.message || 'Invoice submitted to buyer successfully'
    };
  } catch (error: any) {
    const errorMessage = getApiErrorMessage(error, 'Submit Buyer Initiated Invoice');
    return { success: false, error: errorMessage };
  }
}

// ==================== AUTHENTICATION ACTIONS ====================

export interface CheckUserStatusResult {
  success: boolean;
  isRegistered: boolean;
  hasEtims?: boolean;
  hasVat?: boolean;
  name?: string;
  pin?: string;
  entities?: Array<{ name: string; pin: string }>;
  error?: string;
}

/**
 * Check if user is registered for eTIMS service
 */
export async function checkUserStatus(msisdn: string): Promise<CheckUserStatusResult> {
  let cleanNumber = msisdn.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (!cleanNumber.startsWith('254')) cleanNumber = '254' + cleanNumber;

  console.log('Checking user status for:', cleanNumber);

  try {
    const response = await axios.post(
      `${BASE_URL}/init`,
      { msisdn: cleanNumber },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    console.log('Init response:', JSON.stringify(response.data, null, 2));

    // code 1 = registered, code 0 = not registered
    const isRegistered = response.data.code === 1;
    
    return {
      success: true,
      isRegistered,
      hasEtims: response.data.has_etims,
      hasVat: response.data.has_vat,
      name: response.data.name,
      pin: response.data.entities?.[0]?.pin,
      entities: response.data.entities,
    };
  } catch (error: any) {
    console.error('Check user status error:', error.response?.data || error.message);
    return {
      success: false,
      isRegistered: false,
      error: error.response?.data?.message || 'Failed to check registration status'
    };
  }
}

export interface LookupByIdResult {
  success: boolean;
  idNumber?: string;
  name?: string;
  pin?: string;
  error?: string;
}

/**
 * Lookup user details by ID number (using PIN or ID lookup API)
 */
export async function lookupById(idNumber: string): Promise<LookupByIdResult> {
  if (!idNumber || idNumber.trim().length < 6) {
    return { success: false, error: 'ID number must be at least 6 characters' };
  }

  console.log('Looking up ID:', idNumber);

  try {
    // Using the buyer-initiated/lookup API which works with both PIN and ID
    const response = await axios.post(
      `${BASE_URL}/buyer-initiated/lookup`,
      { pin_or_id: idNumber.trim() },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    console.log('ID lookup response:', JSON.stringify(response.data, null, 2));

    // API returns { code: 3, name: "...", pin: "..." } on success
    if (response.data && (response.data.pin || response.data.code === 3 || response.data.name)) {
      return {
        success: true,
        idNumber: idNumber.trim(),
        name: response.data.name,
        pin: response.data.pin,
      };
    } else {
      return { success: false, error: response.data.message || 'ID not found' };
    }
  } catch (error: any) {
    console.error('ID lookup error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'ID lookup failed' };
  }
}

export interface RegisterTaxpayerResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Register taxpayer for USSD/eTIMS service
 */
export async function registerTaxpayer(idNumber: string, msisdn: string): Promise<RegisterTaxpayerResult> {
  let cleanNumber = msisdn.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (!cleanNumber.startsWith('254')) cleanNumber = '254' + cleanNumber;

  console.log('Registering taxpayer:', { idNumber, msisdn: cleanNumber });

  try {
    const response = await axios.post(
      `${BASE_URL}/register-tax-payer`,
      { id_number: idNumber.trim(), msisdn: cleanNumber },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    console.log('Register response:', JSON.stringify(response.data, null, 2));

    // code 5 = registration successful
    if (response.data.code === 5) {
      return { success: true, message: response.data.message || 'Registration successful' };
    } else {
      return { success: false, error: response.data.message || 'Registration failed' };
    }
  } catch (error: any) {
    console.error('Register taxpayer error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'Registration failed' };
  }
}

export interface GenerateOTPResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Generate and send OTP to user's phone
 */
export async function generateOTP(msisdn: string): Promise<GenerateOTPResult> {
  let cleanNumber = msisdn.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (!cleanNumber.startsWith('254')) cleanNumber = '254' + cleanNumber;

  console.log('Generating OTP for:', cleanNumber);

  try {
    const response = await axios.post(
      `${BASE_URL}/otp`,
      { msisdn: cleanNumber },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    console.log('Generate OTP response:', JSON.stringify(response.data, null, 2));

    return {
      success: true,
      message: response.data.message || 'OTP sent successfully'
    };
  } catch (error: any) {
    console.error('Generate OTP error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to send OTP' 
    };
  }
}

export interface VerifyOTPResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Verify OTP entered by user
 */
export async function verifyOTP(msisdn: string, otp: string): Promise<VerifyOTPResult> {
  let cleanNumber = msisdn.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (!cleanNumber.startsWith('254')) cleanNumber = '254' + cleanNumber;

  console.log('Verifying OTP for:', cleanNumber);

  try {
    const response = await axios.post(
      `${BASE_URL}/validate-otp`,
      { msisdn: cleanNumber, otp: otp.trim().toUpperCase() },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    console.log('Verify OTP response:', JSON.stringify(response.data, null, 2));

    // Check for success (varies by API)
    if (response.data.code === 0 || response.data.success === false) {
      return { success: false, error: response.data.message || 'Invalid OTP' };
    }

    return {
      success: true,
      message: response.data.message || 'OTP verified'
    };
  } catch (error: any) {
    console.error('Verify OTP error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || 'OTP verification failed' 
    };
  }
}

// ==================== WHATSAPP TEXT MESSAGE SENDING ====================

export interface SendWhatsAppMessageParams {
  recipientPhone: string; // The phone number to send to
  message: string;        // The text message to send
}

export interface SendWhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a text message via WhatsApp to a user
 * Used for sending notifications, confirmations, etc.
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageParams
): Promise<SendWhatsAppMessageResult> {
  const { recipientPhone, message } = params;

  // Validate required params
  if (!recipientPhone || !message) {
    return { success: false, error: 'Recipient phone and message are required' };
  }

  // Clean phone number - ensure format is 2547XXXXXXXX (no + symbol)
  let cleanNumber = recipientPhone.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '254' + cleanNumber.substring(1);
  } else if (cleanNumber.startsWith('+')) {
    cleanNumber = cleanNumber.substring(1);
  }

  // WhatsApp API configuration from environment variables
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
    to: cleanNumber,
    type: "text",
    text: {
      preview_url: false,
      body: message
    }
  };

  console.log('Sending WhatsApp message:', { to: cleanNumber, messageLength: message.length });

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('WhatsApp message sent successfully:', response.data);

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

// ==================== WHATSAPP DOCUMENT SENDING ====================

export interface SendWhatsAppDocumentParams {
  recipientPhone: string; // The phone number to send to (current user's phone)
  documentUrl: string;    // Public URL to the PDF document
  caption: string;        // Message to accompany the document
  filename: string;       // Filename for the document
}

export interface SendWhatsAppDocumentResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a document (PDF) via WhatsApp to a user
 * Used for sending invoices, credit notes, reports, etc.
 */
export async function sendWhatsAppDocument(
  params: SendWhatsAppDocumentParams
): Promise<SendWhatsAppDocumentResult> {
  const { recipientPhone, documentUrl, caption, filename } = params;

  // Validate required params
  if (!recipientPhone || !documentUrl) {
    return { success: false, error: 'Recipient phone and document URL are required' };
  }

  // Clean phone number - ensure format is 2547XXXXXXXX (no + symbol)
  let cleanNumber = recipientPhone.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '254' + cleanNumber.substring(1);
  } else if (cleanNumber.startsWith('+')) {
    cleanNumber = cleanNumber.substring(1);
  }

  // WhatsApp API configuration from environment variables
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
    to: cleanNumber,
    type: "document",
    document: {
      link: documentUrl,
      caption: caption,
      filename: filename
    }
  };

  console.log('Sending WhatsApp document:', { to: cleanNumber, filename, documentUrl });

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('WhatsApp document sent successfully:', response.data);

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id
    };
  } catch (error: any) {
    console.error('Error sending WhatsApp document:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || 'Failed to send document via WhatsApp'
    };
  }
}
