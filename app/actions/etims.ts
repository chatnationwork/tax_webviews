'use server';

import axios from 'axios';
import { cookies } from 'next/headers';
import { 
  getAuthHeaders, 
  generateOTP as sharedGenerateOTP, 
  validateOTP as sharedValidateOTP,
  sendWhatsAppMessage as sharedSendWhatsAppMessage,
  sendWhatsAppDocument as sharedSendWhatsAppDocument,
  OTPResult,
  SendWhatsAppMessageParams,
  SendWhatsAppMessageResult,
  SendWhatsAppDocumentParams,
  SendWhatsAppDocumentResult
} from './auth';

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

// getAuthHeaders is imported from ./auth


/**
 * Logs detailed error on server, returns friendly message string
 */
const getApiErrorMessage = (error: any, context: string = 'API'): string => {
  console.error(`[${context}] API Error:`, {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message,
    url: error.config?.url,
  });
  
  const apiMessage = error.response?.data?.message || error.response?.data?.error;
  if (apiMessage && typeof apiMessage === 'string') {
    return apiMessage;
  }
  
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
        headers: await getAuthHeaders(),
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
          msisdn: response.data.msisdn || '' 
        }
      };
    } else {
        return {
            success: false,
            error: response.data.message || 'Customer not found'
        };
    }
  } catch (error: any) {
    console.error('[Customer Lookup] Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    
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
  if (!request.msisdn) {
    return { success: false, error: 'Customer phone number is required' };
  }

  if (!request.items || request.items.length === 0) {
    return { success: false, error: 'Please add at least one item to the invoice' };
  }

  if (request.total_amount <= 0) {
    return { success: false, error: 'Total amount must be greater than 0' };
  }

  for (const item of request.items) {
    if (!item.item_name || item.item_name.trim() === '') {
      return { success: false, error: 'Item name is required for all items' };
    }
    if (item.taxable_amount <= 0) {
      return { success: false, error: 'Price must be greater than 0 for all items' };
    }
    if (item.quantity <= 0) {
      return { success: false, error: 'Quantity must be a positive number for all items' };
    }
  }

  request.source = 'whatsapp';

  console.log('Submitting invoice:', JSON.stringify(request, null, 2));

  try {
    const response = await axios.post(
      `${BASE_URL}/post-sale`,
      request,
      {
        headers: {
          ...(await getAuthHeaders()),
          'x-source-for': 'whatsapp'
        },
        timeout: 60000, 
      }
    );

    console.log('Invoice API Response:', JSON.stringify(response.data, null, 2));

    // API returns code 8 for success
    // Transform to InvoiceSubmissionResult interface
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
          ...(await getAuthHeaders()),
          'x-source-for': 'whatsapp'
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
      // Paginated format: { invoices: { entries: [...], total_entries: N } }
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
      return inv;
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
          ...(await getAuthHeaders()),
          'x-source-for': 'whatsapp'
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

  if (request.credit_note_type === "partial") {
     // Validate each item
     for (const item of request.items) {
       if (item.quantity <= 0) {
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
    
    

    let endpoint = '';
    let payload: any = {
      msisdn: cleanNumber,
      reason: request.reason
    };
    // Extract the integer suffix from the invoice number (e.g., "KRASRN000025764/48" -> 48)
    const invoiceSuffix = parseInt(request.invoice_no.split('/').pop() || '0', 10);

    payload.invoice_no = invoiceSuffix;
    

    if (request.credit_note_type === 'full') {
      endpoint = `${BASE_URL}/submit/credit-note`;
      
      payload.full = true;
      // No items needed for full credit note
    } else {
      endpoint = `${BASE_URL}/submit/partial-credit-note`;
      
      // Map items to expected structure
      payload.items = request.items.map(item => {
        const { taxable_amount, ...otherProps } = item;
        return {
          ...otherProps,
          id: item.item_id,
          item_price: item.taxable_amount && item.quantity > 0 ? item.taxable_amount / item.quantity : 0 
        };
      });
      
      payload.source = 'whatsapp';
    }

    console.log(`Submitting ${request.credit_note_type} credit note to:`, endpoint);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(
      endpoint,
      payload,
      {
        headers: {
          ...(await getAuthHeaders()),
          'x-source-for': 'whatsapp'
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
  action: 'accept' | 'reject',
  sellerName: string = 'Valued Partner' // Default for backward compatibility if missed
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
          ...(await getAuthHeaders()),
          'x-source-for': 'whatsapp'
        },
        timeout: 30000
      }
    );

    console.log('Process invoice response:', JSON.stringify(response.data, null, 2));

    // If accepted, poll for the approved invoice to get the PDF URL
    if (action === 'accept' && (response.data.success !== false)) {
    

      (async () => {
        try {
          console.log(`Starting polling for approved invoice ${invoiceRef} PDF...`);
          // Try 3 times with delay
          for (let i = 0; i < 3; i++) {
            const delay = (i + 1) * 2000; // 2s, 4s, 6s - wait, user said 1 or 3 seconds. Let's do 2s delay.
            console.log(`Polling attempt ${i + 1}/3... waiting 2s`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const fetchResult = await fetchInvoices(cleanNumber, undefined, 'accepted', 'supplier');
            
            if (fetchResult.success && fetchResult.invoices) {
              console.log(`Fetched ${fetchResult.invoices.length} accepted invoices.`);
            
              const approvedInvoice = fetchResult.invoices.find(inv => 
                (inv.invoice_number === invoiceRef) || 
                (inv.reference === invoiceRef) ||
                (inv.invoice_id === invoiceRef) ||
                (inv.total_amount && inv.buyer_name && `${inv.reference}`.includes(invoiceRef))
              );

              if (approvedInvoice) {
                console.log('Approved invoice found:', JSON.stringify(approvedInvoice, null, 2));
                
                if (approvedInvoice.invoice_pdf_url) {
                  console.log('PDF URL found, sending WhatsApp...');
                  await sendBuyerStatusUpdateWithPdf(
                    approvedInvoice.supplier_msisdn || cleanNumber,
                    approvedInvoice.seller_name || sellerName || 'Partner',
                    `${approvedInvoice.invoice_number || invoiceRef}`,
                    `approved`,
                    approvedInvoice.invoice_pdf_url
                  );

                  if (approvedInvoice.buyer_msisdn) {
                    console.log(`Sending PDF to buyer (${approvedInvoice.buyer_msisdn})...`);
                    await sendBuyerStatusUpdateWithPdf(
                      approvedInvoice.buyer_msisdn,
                      approvedInvoice.buyer_name || 'Customer',
                      `${approvedInvoice.invoice_number || invoiceRef}`,
                      `approved`,
                      approvedInvoice.invoice_pdf_url
                    );
                  }
                  // Found and sent
                  break; 
                } else {
                  console.log('Invoice found but PDF URL missing yet.');
                }
              } else {
                console.log(`Invoice ${invoiceRef} not found in fetch results yet.`);
              }
            } else {
              console.log('Fetch invoices failed or empty:', fetchResult.error);
            }
          }
        } catch (pollError) {
          console.error('Error polling for invoice PDF:', pollError);
        }
      })();
    }

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
 * Process multiple buyer initiated invoices (bulk accept/reject)
 */
export async function processBuyerInvoiceBulk(
  msisdn: string,
  invoices: { ref: string; buyerPhone: string; buyerName: string; totalAmount: number | string }[],
  action: 'accept' | 'reject',
  sellerName: string
): Promise<{ success: boolean; processed: number; failed: number; errors: string[] }> {
  if (!msisdn) return { success: false, processed: 0, failed: 0, errors: ['Phone number is required'] };
  if (!invoices || invoices.length === 0) return { success: false, processed: 0, failed: 0, errors: ['No invoices selected'] };

  console.log(`Processing bulk invoices for ${msisdn}: ${action} (${invoices.length} items)`);

  const results = await Promise.all(
    invoices.map(async (inv) => {
      const result = await processBuyerInvoice(msisdn, inv.ref, action);
      if (result.success) {
        // Send alert to Buyer
        if (inv.buyerPhone) {
          await sendBuyerInvoiceAlert(
            inv.buyerPhone,
            inv.buyerName || 'Customer',
            action === 'accept' ? 'accepted' : 'rejected',
            sellerName || 'the Seller'
          );
        }
      }
      return result;
    })
  );

  const processed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const errors = results.filter(r => !r.success && r.error).map(r => r.error as string);

  // Send summary notification to Seller
  if (processed > 0) {
    const statusText = action === 'accept' ? 'approved' : 'rejected';
    
    // Get list of successful invoices
    const successfulItems = invoices.filter((_, index) => results[index].success);
    const invoiceList = successfulItems.map((inv, i) => `${i + 1}. ${inv.ref} - ${inv.buyerName} - Total: ${inv.totalAmount}`).join('\n');
    
    await sendWhatsAppMessage({
      recipientPhone: msisdn,
      message: `Dear ${sellerName || 'Seller'}, the following invoices have been ${statusText}:\n\n${invoiceList}`
    });
  }

  return {
    success: failed === 0,
    processed,
    failed,
    errors
  };
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
        items: request.items,
        supplier_name:request.seller_name,
        source: 'whatsapp'
      },
      {
        headers: {
          ...(await getAuthHeaders()),
          'x-source-for': 'whatsapp'
        },
        timeout: 30000
      }
    );

    console.log('Submit buyer initiated invoice response:', JSON.stringify(response.data, null, 2));

    return {
      success: response.data.success !== false, // Some APIs return success: true/false, others implict success
      invoice_id: response.data.invoice_id || response.data.reference || response.data.invoice_no,
      invoice_number: response.data.invoice_number || response.data.invoice_no,
      reference: response.data.reference,
      invoice_pdf_url: response.data.invoice_pdf_url,
      message: response.data.message || 'Invoice submitted to buyer successfully'
    };
  } catch (error: any) {
    const errorMessage = getApiErrorMessage(error, 'Submit Buyer Initiated Invoice');
    return { success: false, error: errorMessage };
  }
}

// AUTHENTICATION ACTIONS 

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
      {
        headers: {
          "Content-Type": "application/json",
         
        },
        timeout: 30000
      }
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
    const response = await axios.post(
      'https://kratest.pesaflow.com/api/ussd/id-lookup',
      { 
        id_number: idNumber.trim(),
        msisdn: cleanNumber
      },
      { 
        headers: { 
          "Content-Type": "application/json",
         
        }, 
        timeout: 30000 
      }
    );

    console.log('ID lookup response:', JSON.stringify(response.data, null, 2));

    // Check if we got a valid response with data
    if (response.data && response.data.name && response.data.yob) {
      
      // Validate Year of Birth
      const returnedYob = response.data.yob ? response.data.yob.toString() : '';
      
      // Strict comparison or loose? "1988" vs "1988"
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
      {
        headers: {
          ...(await getAuthHeaders()),
          'x-source-for': 'whatsapp'
        },
        timeout: 30000
      }
    );

    console.log('Register response:', JSON.stringify(response.data, null, 2));

    // code 5 = registration successful
    if (response.data.code === 5) {
      return { success: true, message: response.data.message || 'Registration successful' };
    } else if (response.data.code === 22) {
    
      await sendWhatsAppMessage({
        recipientPhone: cleanNumber,
        message: "Dear Customer, your registration is currently in progress. Kindly try logging in again shortly.\n\n For more information, visit https://www.kra.go.ke/business/etims-electronic-tax-invoice-management-system/learn-about-etims/what-is-etims"
      });
      
      return { success: false, error: 'Registration is currently in progress. Kindly try logging in again shortly.' };
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
/**
 * Generate and send OTP to user's phone
 * (Delegates to shared auth action)
 */
export async function generateOTP(msisdn: string): Promise<GenerateOTPResult> {
  const result = await sharedGenerateOTP(msisdn);
  // Map shared result to local interface if needed (they are compatible)
  return {
    success: result.success,
    message: result.message,
    error: result.error
  };
}


export interface VerifyOTPResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Verify OTP entered by user
 */
/**
 * Verify OTP entered by user
 * (Delegates to shared auth action)
 */
export async function verifyOTP(msisdn: string, otp: string): Promise<VerifyOTPResult> {
  const result = await sharedValidateOTP(msisdn, otp);
  
  if (result.success && result.token) {
      // Shared action already sets cookies, so we don't strictly need to do it here
      // But preserving specific cookie logic just in case differs (it seems compatible: etims_auth_token)
  }

  return {
    success: result.success,
    message: result.message,
    error: result.error
  };
}


// WHATSAPP TEXT MESSAGE SENDING

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


// WHATSAPP DOCUMENT SENDING

// Types imported from ./auth


/**
 * Send a document (PDF) via WhatsApp to a user
 * Used for sending invoices, credit notes, reports, etc.
 */
/**
 * Send a document (PDF) via WhatsApp to a user
 */
export async function sendWhatsAppDocument(
  params: SendWhatsAppDocumentParams
): Promise<SendWhatsAppDocumentResult> {
    return sharedSendWhatsAppDocument(params);
}


/**
 * Send template message to buyer when invoice is approved/rejected
 */
export async function sendBuyerInvoiceAlert(
  recipientPhone: string,
  buyerName: string,
  status: string, // accepted/rejected
  sellerName: string
): Promise<{ success: boolean; error?: string }> {
  
  if (!recipientPhone) return { success: false, error: 'Recipient phone required' };

  // Clean phone number
  let cleanNumber = recipientPhone.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1);

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    console.error('WhatsApp credentials missing');
    return { success: false, error: 'Configuration error' };
  }

  const url = `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanNumber,
    type: "template",
    template: {
      name: "inoice_alert_buyer",
      language: { code: "en",policy: "deterministic" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: buyerName || "Valued Customer" },
            { type: "text", text: status },
            { type: "text", text: sellerName || "the Seller" }
          ]
        }
      ]
    }
  };

  try {
    await axios.post(url, payload, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send invoice PDF with status update using specific template
 */
export async function sendBuyerStatusUpdateWithPdf(
  recipientPhone: string,
  personName: string,
  line1: string,
  line2: string,
  pdfUrl: string
): Promise<{ success: boolean; error?: string }> {
  
  if (!recipientPhone) return { success: false, error: 'Recipient phone required' };

  // Clean phone number
  let cleanNumber = recipientPhone.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1);

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    console.error('WhatsApp credentials missing');
    return { success: false, error: 'Configuration error' };
  }

  const url = `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanNumber,
    type: "template",
    template: {
      name: "buyer_alert_for_invoice_status_update",
      language: { code: "en", policy: "deterministic" },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: pdfUrl,
                filename: "invoice.pdf" // Optional but good practice
              }
            }
          ]
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: personName || "Valued Customer" },
            { type: "text", text: line1 },
            { type: "text", text: line2 } 
          ]
        }
      ]
    }
  };


  try {
    const finalPayload = {
      ...payload,
      template: {
        ...payload.template,
        components: [
          payload.template.components[0],
          {
            type: "body",
            parameters: [
              { type: "text", text: personName },
              { type: "text", text: line1 },
              { type: "text", text: line2 }
            ]
          }
        ]
      }
    };

    console.log('Sending WhatsApp Template:', JSON.stringify(finalPayload, null, 2));
    await axios.post(url, finalPayload, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000
    });
    return { success: true };
  } catch (error: any) {
    console.error('WhatsApp Template Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send template message to seller when a buyer-initiated invoice is created
 */
export async function sendBuyerInitiatedInvoiceAlert(
  recipientPhone: string,
  sellerName: string,
  buyerName: string,
  amount: string,
  invoiceNumber: string
): Promise<{ success: boolean; error?: string }> {
  
  if (!recipientPhone) return { success: false, error: 'Recipient phone required' };

  // Clean phone number
  let cleanNumber = recipientPhone.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1);

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    console.error('WhatsApp credentials missing');
    return { success: false, error: 'Configuration error' };
  }

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const url = `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanNumber,
    type: "template",
    template: {
      name: "alert_seller_invoice_buyer_initiated",
      language: { code: "en",policy: "deterministic" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: sellerName || "Seller" },
            { type: "text", text: buyerName || "Buyer" },
            { type: "text", text: amount },
            { type: "text", text: today }
          ]
        }
      ]
    }
  };

  try {
    await axios.post(url, payload, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000
    });
    return { success: true };
  } catch (error: any) {
    console.error('WhatsApp template error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}
export async function sendInvoiceCreditDocTemplate(
  recipientPhone: string,
  name: string,
  docRef: string,
  amount: string,
  date: string,
  pdfUrl: string
): Promise<{ success: boolean; error?: string }> {
  
  if (!recipientPhone) return { success: false, error: 'Recipient phone required' };

  // Clean phone number
  let cleanNumber = recipientPhone.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1);

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    console.error('WhatsApp credentials missing');
    return { success: false, error: 'Configuration error' };
  }

  const url = `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanNumber,
    type: "template",
    template: {
      name: "invoice_credit_doc",
      language: { code: "en", policy: "deterministic" },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: pdfUrl,
                filename: "document.pdf" 
              }
            }
          ]
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: name },
            { type: "text", text: docRef },
            { type: "text", text: amount },
            { type: "text", text: date }
          ]
        }
      ]
    }
  };

  try {
    console.log('Sending WhatsApp Template:', JSON.stringify(payload, null, 2));
    await axios.post(url, payload, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000
    });
    return { success: true };
  } catch (error: any) {
    console.error('WhatsApp Template Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}
export async function sendDownloadInvoicesTemplate(
  recipientPhone: string,
  docRef: string,
  amount: string,
  sellerName: string,
  pdfUrl: string
): Promise<{ success: boolean; error?: string }> {
  
  if (!recipientPhone) return { success: false, error: 'Recipient phone required' };

  // Clean phone number
  let cleanNumber = recipientPhone.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1);

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    console.error('WhatsApp credentials missing');
    return { success: false, error: 'Configuration error' };
  }

  const url = `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanNumber,
    type: "template",
    template: {
      name: "download_invoices",
      language: { code: "en", policy: "deterministic" },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: pdfUrl,
                filename: "document.pdf" 
              }
            }
          ]
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: docRef },
            { type: "text", text: amount },
            { type: "text", text: sellerName }
          ]
        }
      ]
    }
  };

  try {
    console.log('Sending WhatsApp Template:', JSON.stringify(payload, null, 2));
    await axios.post(url, payload, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000
    });
    return { success: true };
  } catch (error: any) {
    console.error('WhatsApp Template Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

export async function sendDownloadInvoiceTemplate(
  recipientPhone: string,
  docDetails: string,
  amount: string,
  partyDetails: string,
  pdfUrl: string
): Promise<{ success: boolean; error?: string }> {
  
  if (!recipientPhone) return { success: false, error: 'Recipient phone required' };

  // Clean phone number
  let cleanNumber = recipientPhone.trim().replace(/[^\d]/g, '');
  if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
  else if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1);

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    console.error('WhatsApp credentials missing');
    return { success: false, error: 'Configuration error' };
  }

  const url = `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanNumber,
    type: "template",
    template: {
      name: "download_invoices",
      language: { code: "en", policy: "deterministic" },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: pdfUrl,
                filename: "document.pdf" 
              }
            }
          ]
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: docDetails },
            { type: "text", text: amount },
            { type: "text", text: partyDetails }
          ]
        }
      ]
    }
  };

  try {
    console.log('Sending WhatsApp Template:', JSON.stringify(payload, null, 2));
    await axios.post(url, payload, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000
    });
    return { success: true };
  } catch (error: any) {
    console.error('WhatsApp Template Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}
