
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
  error?: string;
}

// Invoice from API response
export interface FetchedInvoice {
  invoice_id: string;
  reference: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'rejected';
  buyer_name: string;
  seller_name: string;
  created_at: string;
  rejection_reason?: string;
  items: {
    item_name: string;
    quantity: number;
    unit_price: number;
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
  | 'missing_data'
  | 'damaged_goods'
  | 'wrong_items'
  | 'pricing_error'
  | 'customer_return'
  | 'other';

export const CREDIT_NOTE_REASONS: { value: CreditNoteReason; label: string }[] = [
  { value: 'missing_data', label: 'Missing Data' },
  { value: 'damaged_goods', label: 'Damaged Goods' },
  { value: 'wrong_items', label: 'Wrong Items Delivered' },
  { value: 'pricing_error', label: 'Pricing Error' },
  { value: 'customer_return', label: 'Customer Return' },
  { value: 'other', label: 'Other' }
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
  message?: string;
  error?: string;
}
