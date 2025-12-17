
// Customer lookup response type
export interface CustomerLookupResult {
  success: boolean;
  customer?: {
    name: string;
    pin: string;
    msisdn: string;
  };
  error?: string;
}

// Invoice item type
export interface InvoiceItem {
  item_name: string;
  description?: string;
  taxable_amount: number;
  quantity: number;
  item_total: number;
}

// Invoice submission request
export interface InvoiceSubmissionRequest {
  msisdn: string;
  total_amount: number;
  items: {
    item_name: string;
    taxable_amount: number;
    quantity: number;
  }[];
}

// Invoice submission response
export interface InvoiceSubmissionResult {
  success: boolean;
  invoice_id?: string;
  message?: string;
  transaction_reference?: string;
  invoice_pdf_url?: string;
  invoice_preview_url?: string;
  error?: string;
}

// Invoice from API response
export interface FetchedInvoice {
  // Legacy fields (for backwards compatibility)
  invoice_id?: string;
  reference?: string;
  
  // Actual API fields
  uuid?: string;
  invoice_number?: string;
  total_amount: number;
  status?: 'pending' | 'completed' | 'rejected' | 'approved' | 'accepted' | 'awaiting_approval';
  buyer_name?: string;
  buyer_msisdn?: string;
  seller_name?: string;
  supplier_msisdn?: string;
  supplier_pin?: string;
  created_at?: string;
  rejection_reason?: string;
  invoice_pdf_url?: string;
  invoice_preview_url?: string;
  items?: {
    item_name: string;
    quantity: number | string;
    unit_price: number | string;
    total?: number | string;
    type_of_item?: string;
  }[];
}

// Fetch invoices response
export interface FetchInvoicesResult {
  success: boolean;
  invoices?: FetchedInvoice[];
  error?: string;
}

// Credit Note Types
export type CreditNoteType = 'partial' | 'full';

export type CreditNoteReason = 
  | 'missing_quantity'
  | 'missing_data'
  | 'damaged'
  | 'wasted'
  | 'raw_material_shortage'
  | 'refund';

export const CREDIT_NOTE_REASONS: { value: CreditNoteReason; label: string }[] = [
  { value: 'missing_quantity', label: 'Missing Quantity' },
  { value: 'missing_data', label: 'Missing Data' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'wasted', label: 'Wasted' },
  { value: 'raw_material_shortage', label: 'Raw Material Shortage' },
  { value: 'refund', label: 'Refund' }
];

// Credit Note Invoice Item
export interface CreditNoteItem {
  item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  currency?: string;
}

// Credit Note Invoice
export interface CreditNoteInvoice {
  invoice_no: string;
  invoice_id?: string;
  total_amount: number;
  currency?: string;
  seller_name?: string;
  buyer_name?: string;
  items?: CreditNoteItem[];
}

// Search Credit Note Response
export interface SearchCreditNoteResult {
  success: boolean;
  invoice?: CreditNoteInvoice;
  hasPartialCreditNote?: boolean;
  error?: string;
}

// Submit Credit Note Request
export interface SubmitCreditNoteRequest {
  msisdn: string;
  invoice_no: string;
  credit_note_type: CreditNoteType;
  reason: CreditNoteReason;
  items: {
    item_id: string;
    return_quantity: number;
  }[];
}

// Submit Credit Note Response
export interface SubmitCreditNoteResult {
  success: boolean;
  credit_note_id?: string;
  credit_note_ref?: string;
  credit_note_pdf_url?: string;
  message?: string;
  error?: string;
}

// Submit Buyer Initiated Invoice Request
export interface SubmitBuyerInitiatedInvoiceRequest {
  msisdn: string; // Buyer's phone
  seller_pin: string;
  seller_msisdn?: string;
  total_amount: number;
  items: {
    item_name: string;
    taxable_amount: number;
    quantity: number;
  }[];
}

// Submit Buyer Initiated Invoice Response
export interface SubmitBuyerInitiatedInvoiceResult {
  success: boolean;
  invoice_id?: string;
  reference?: string;
  invoice_pdf_url?: string;
  message?: string;
  error?: string;
}
