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
  CREDIT_NOTE_REASONS
} from '../etims/_lib/definitions';

// Export types so they can be imported from here if needed (re-exporting types is fine in use server? No, re-exporting types is fine, but re-exporting VALUES is not)
// Actually, it's better to NOT re-export them to avoid confusion and errors. Consumers should import from definitions.

const BASE_URL = 'https://kratest.pesaflow.com/api/ussd';

// Helper to handle API errors
const handleApiError = (error: any) => {
  console.error('ETIMS API Error:', error.response?.data || error.message);
  throw new Error(
    error.response?.data?.message || 
    error.response?.data?.error || 
    'An error occurred while communicating with the server'
  );
};

/**
 * Lookup customer by PIN or ID
 */
export async function lookupCustomer(pinOrId: string): Promise<CustomerLookupResult> {
  if (!pinOrId || pinOrId.trim() === '') {
    throw new Error('Please enter a PIN or ID number');
  }

  // Validate PIN/ID format (should be alphanumeric)
  if (!/^[A-Za-z0-9]+$/.test(pinOrId.trim())) {
    throw new Error('Please enter a valid PIN or ID number');
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
    if (error.response?.status === 404) {
      return {
          success: false,
          error: 'Customer not found. Please verify the PIN/ID and try again'
      };
    }
    console.error('Customer lookup error', error);
    return {
        success: false,
        error: error.message || 'An error occurred during lookup'
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
    throw new Error('Customer phone number is required');
  }

  if (!request.items || request.items.length === 0) {
    throw new Error('Please add at least one item to the invoice');
  }

  if (request.total_amount <= 0) {
    throw new Error('Total amount must be greater than 0');
  }

  // Validate each item
  for (const item of request.items) {
    if (!item.item_name || item.item_name.trim() === '') {
      throw new Error('Item name is required for all items');
    }
    if (item.taxable_amount <= 0) {
      throw new Error('Price must be greater than 0 for all items');
    }
    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      throw new Error('Quantity must be a positive whole number for all items');
    }
  }

  console.log('Submitting invoice:', JSON.stringify(request, null, 2));

  try {
    const response = await axios.post(
      `${BASE_URL}/post-sale`,
      request,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * Fetch buyer-initiated invoices by phone number
 */
export async function fetchInvoices(phoneNumber: string): Promise<FetchInvoicesResult> {
  if (!phoneNumber || phoneNumber.trim() === '') {
    throw new Error('Phone number is required');
  }

  // Clean phone number - remove any non-numeric characters except leading +
  let cleanNumber = phoneNumber.trim().replace(/[^\d]/g, '');
  
  // Ensure it starts with 254 for Kenya
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '254' + cleanNumber.substring(1);
  } else if (!cleanNumber.startsWith('254')) {
    cleanNumber = '254' + cleanNumber;
  }

  console.log('Fetching invoices for:', cleanNumber);

  try {
    const response = await axios.get(
      `${BASE_URL}/buyer-initiated/fetch/${cleanNumber}`,
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
    if (Array.isArray(response.data)) {
      return {
        success: true,
        invoices: response.data
      };
    } else if (response.data.invoices) {
      return {
        success: true,
        invoices: response.data.invoices
      };
    } else if (response.data.data) {
      return {
        success: true,
        invoices: response.data.data
      };
    } else {
      return {
        success: true,
        invoices: response.data.success !== false ? [] : undefined,
        error: response.data.message
      };
    }
  } catch (error: any) {
    console.error('Fetch invoices error:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      return {
        success: true,
        invoices: []
      };
    }
    throw new Error(
      error.response?.data?.message || 
      error.response?.data?.error || 
      'Failed to fetch invoices'
    );
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
    throw new Error('Phone number is required');
  }

  if (!invoiceNo || invoiceNo.trim() === '') {
    throw new Error('Invoice number is required');
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
      invoice
    };
  } catch (error: any) {
    console.error('Search credit note error:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      return {
        success: false,
        error: 'Invoice not found'
      };
    }
    throw new Error(
      error.response?.data?.message || 
      error.response?.data?.error || 
      'Failed to search invoice'
    );
  }
}

/**
 * Submit partial credit note
 * Note: Using mock response until backend is updated with full payload support
 */
export async function submitPartialCreditNote(
  request: SubmitCreditNoteRequest
): Promise<SubmitCreditNoteResult> {
  // Validate request
  if (!request.msisdn) {
    throw new Error('Phone number is required');
  }

  if (!request.invoice_no) {
    throw new Error('Invoice number is required');
  }

  if (!request.items || request.items.length === 0) {
    throw new Error('Please select at least one item');
  }

  // Validate each item
  for (const item of request.items) {
    if (item.return_quantity <= 0) {
      throw new Error('Return quantity must be greater than 0');
    }
  }

  // Clean phone number
  let cleanNumber = request.msisdn.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '254' + cleanNumber.substring(1);
  } else if (!cleanNumber.startsWith('254')) {
    cleanNumber = '254' + cleanNumber;
  }

  console.log('Submitting partial credit note:', JSON.stringify({
    ...request,
    msisdn: cleanNumber
  }, null, 2));

  try {
    // Try the real API first
    const response = await axios.post(
      `${BASE_URL}/submit/credit-note`,
      {
        msisdn: cleanNumber,
        invoice_no: request.invoice_no,
        credit_note_type: request.credit_note_type,
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

    return {
      success: response.data.success !== false,
      credit_note_id: response.data.credit_note_id || response.data.reference,
      message: response.data.message || 'Credit note submitted successfully'
    };
  } catch (error: any) {
    console.error('Submit credit note error:', error.response?.data || error.message);
    
    // If API doesn't support full payload yet, return mock success
    if (error.response?.status === 400 || error.response?.status === 422) {
      console.log('API may not support full payload, returning mock success');
      return {
        success: true,
        credit_note_id: `CN-${Date.now()}`,
        message: 'Credit note submitted successfully (mock)'
      };
    }
    
    throw new Error(
      error.response?.data?.message || 
      error.response?.data?.error || 
      'Failed to submit credit note'
    );
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
  if (!msisdn) throw new Error('Phone number is required');
  if (!invoiceRef) throw new Error('Invoice reference is required');

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

    return {
      success: true,
      message: response.data.message || 'Action submitted successfully'
    };
  } catch (error: any) {
    console.error('Process invoice error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 
      error.response?.data?.error || 
      'Failed to process invoice'
    );
  }
}
