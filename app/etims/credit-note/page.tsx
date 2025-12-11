"use client";

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Send,
  ChevronDown,
  Package,
  Minus,
  Plus,
  Check,
  X
} from 'lucide-react';
import { 
  searchCreditNoteInvoice,
  submitPartialCreditNote,
  CreditNoteType,
  CreditNoteReason,
  CreditNoteItem,
  CreditNoteInvoice
} from '@/app/actions/etims';

// Credit Note Reasons - defined locally for client component
const CREDIT_NOTE_REASONS: { value: CreditNoteReason; label: string }[] = [
  { value: 'missing_data', label: 'Missing Data' },
  { value: 'damaged_goods', label: 'Damaged Goods' },
  { value: 'wrong_items', label: 'Wrong Items Delivered' },
  { value: 'pricing_error', label: 'Pricing Error' },
  { value: 'customer_return', label: 'Customer Return' },
  { value: 'other', label: 'Other' }
];

// Selected item with return quantity
interface SelectedItem extends CreditNoteItem {
  selected: boolean;
  return_quantity: number;
}

// Credit Note Content Component
function CreditNoteContent() {
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('number') || searchParams.get('msisdn') || '';

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [creditNoteId, setCreditNoteId] = useState<string | null>(null);

  // Step 1: Search state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [creditNoteType, setCreditNoteType] = useState<CreditNoteType>('partial');
  const [reason, setReason] = useState<CreditNoteReason | ''>('');

  // Step 2-4: Invoice and items state
  const [invoice, setInvoice] = useState<CreditNoteInvoice | null>(null);
  const [items, setItems] = useState<SelectedItem[]>([]);

  // Mock items if API doesn't return them
  const mockItems: CreditNoteItem[] = [
    { item_id: '1', item_name: 'Product A', unit_price: 1000, quantity: 5, currency: 'KES' },
    { item_id: '2', item_name: 'Service B', unit_price: 2500, quantity: 2, currency: 'KES' },
    { item_id: '3', item_name: 'Item C', unit_price: 500, quantity: 10, currency: 'KES' }
  ];

  // Calculate credit note total
  const creditTotal = items
    .filter(item => item.selected && item.return_quantity > 0)
    .reduce((sum, item) => sum + (item.unit_price * item.return_quantity), 0);

  // Step 1: Search invoice
  const handleSearch = async () => {
    if (!invoiceNumber.trim()) {
      setError('Please enter an invoice number');
      return;
    }
    if (!reason) {
      setError('Please select a reason');
      return;
    }
    if (!phoneNumber) {
      setError('Phone number is required in the URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await searchCreditNoteInvoice(phoneNumber, invoiceNumber);
      
      if (result.success && result.invoice) {
        setInvoice(result.invoice);
        
        // Use API items or mock items
        const invoiceItems = result.invoice.items && result.invoice.items.length > 0
          ? result.invoice.items
          : mockItems;
        
        // Initialize items with selection state
        setItems(invoiceItems.map(item => ({
          ...item,
          selected: false,
          return_quantity: 0
        })));
        
        setCurrentStep(2);
      } else {
        setError(result.error || 'Invoice not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search invoice');
    } finally {
      setLoading(false);
    }
  };

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    setItems(items.map(item => {
      if (item.item_id === itemId) {
        return {
          ...item,
          selected: !item.selected,
          return_quantity: !item.selected ? 1 : 0
        };
      }
      return item;
    }));
  };

  // Update return quantity
  const updateReturnQuantity = (itemId: string, quantity: number) => {
    setItems(items.map(item => {
      if (item.item_id === itemId) {
        // Clamp quantity between 0 and original quantity
        const clampedQty = Math.min(Math.max(0, quantity), item.quantity);
        return {
          ...item,
          return_quantity: clampedQty,
          selected: clampedQty > 0
        };
      }
      return item;
    }));
  };

  // Validate item selection before proceeding
  const validateItems = () => {
    const selectedItems = items.filter(item => item.selected);
    if (selectedItems.length === 0) {
      setError('Please select at least one item');
      return false;
    }
    
    for (const item of selectedItems) {
      if (item.return_quantity <= 0) {
        setError(`Please enter a return quantity for ${item.item_name}`);
        return false;
      }
      if (item.return_quantity > item.quantity) {
        setError(`Return quantity cannot exceed original quantity for ${item.item_name}`);
        return false;
      }
    }
    
    setError(null);
    return true;
  };

  // Submit credit note
  const handleSubmit = async () => {
    if (!validateItems()) return;
    if (!invoice || !reason) return;

    setLoading(true);
    setError(null);

    try {
      const selectedItems = items
        .filter(item => item.selected && item.return_quantity > 0)
        .map(item => ({
          item_id: item.item_id,
          return_quantity: item.return_quantity
        }));

      const result = await submitPartialCreditNote({
        msisdn: phoneNumber,
        invoice_no: invoice.invoice_no,
        credit_note_type: creditNoteType,
        reason: reason,
        items: selectedItems
      });

      if (result.success) {
        setCreditNoteId(result.credit_note_id || null);
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to submit credit note');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit credit note');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setCurrentStep(1);
    setInvoiceNumber('');
    setCreditNoteType('partial');
    setReason('');
    setInvoice(null);
    setItems([]);
    setSuccess(false);
    setCreditNoteId(null);
    setError(null);
  };

  // Render Step 1: Search & Initiation
  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Invoice Number <span className="text-[#C8102E]">*</span>
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Enter invoice number (e.g., 1004)"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC0000] text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Credit Note Type <span className="text-[#C8102E]">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCreditNoteType('partial')}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              creditNoteType === 'partial'
                ? 'border-[#CC0000] bg-[#CC0000]/10'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="font-medium text-gray-900">Partial Credit Note</p>
            <p className="text-xs text-gray-500">Credit specific items</p>
          </button>
          <button
            onClick={() => setCreditNoteType('full')}
            disabled
            className="p-3 rounded-lg border-2 border-gray-200 opacity-50 cursor-not-allowed text-left"
          >
            <p className="font-medium text-gray-500">Full Credit Note</p>
            <p className="text-xs text-gray-400">Coming soon</p>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Reason <span className="text-[#C8102E]">*</span>
        </label>
        <div className="relative">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as CreditNoteReason)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC0000] text-sm appearance-none bg-white"
          >
            <option value="">Select a reason...</option>
            {CREDIT_NOTE_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <button
        onClick={handleSearch}
        disabled={loading}
        className="w-full py-3 bg-[#CC0000] text-white rounded-lg hover:bg-[#990000] transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            Search Invoice
          </>
        )}
      </button>
    </div>
  );

  // Render Step 2: Invoice Confirmation
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="bg-[#F5F5F5] rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#CC0000] mb-3">Invoice Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Invoice Number:</span>
            <span className="font-bold text-gray-900">{invoice?.invoice_no}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Credit Note Type:</span>
            <span className="font-medium text-gray-900">Partial Credit Note</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Reason:</span>
            <span className="font-medium text-gray-900">
              {CREDIT_NOTE_REASONS.find(r => r.value === reason)?.label}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-gray-600">Invoice Total:</span>
            <span className="font-bold text-[#CC0000] text-lg">
              KES {invoice?.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep(1)}
          className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        <button
          onClick={() => setCurrentStep(3)}
          className="flex-1 py-3 bg-[#CC0000] text-white rounded-lg hover:bg-[#990000] transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          Update Credit Note
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Render Step 3: Item Selection
  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#CC0000]">Select Items to Credit</h3>
        <span className="text-xs text-gray-500">
          {items.filter(i => i.selected).length} of {items.length} selected
        </span>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <button
            key={item.item_id}
            onClick={() => toggleItemSelection(item.item_id)}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              item.selected
                ? 'border-[#CC0000] bg-[#CC0000]/10'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                item.selected ? 'border-[#CC0000] bg-[#CC0000]' : 'border-gray-300'
              }`}>
                {item.selected && <Check className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.item_name}</p>
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>Unit Price: KES {item.unit_price.toLocaleString()}</span>
                  <span>Qty: {item.quantity}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep(2)}
          className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => {
            const selectedCount = items.filter(i => i.selected).length;
            if (selectedCount === 0) {
              setError('Please select at least one item');
              return;
            }
            setError(null);
            setCurrentStep(4);
          }}
          className="flex-1 py-3 bg-[#CC0000] text-white rounded-lg hover:bg-[#990000] transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Render Step 4: Quantity Adjustment
  const renderStep4 = () => {
    const selectedItems = items.filter(item => item.selected);
    
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-[#CC0000]">Adjust Return Quantities</h3>

        <div className="space-y-3">
          {selectedItems.map(item => (
            <div key={item.item_id} className="bg-[#F5F5F5] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{item.item_name}</p>
                  <p className="text-xs text-gray-500">Original Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-medium text-[#CC0000]">
                  KES {item.unit_price.toLocaleString()} each
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 flex-shrink-0">Return Qty:</label>
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => updateReturnQuantity(item.item_id, item.return_quantity - 1)}
                    className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={item.return_quantity}
                    onChange={(e) => updateReturnQuantity(item.item_id, parseInt(e.target.value) || 0)}
                    min="0"
                    max={item.quantity}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
                  />
                  <button
                    onClick={() => updateReturnQuantity(item.item_id, item.return_quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {item.return_quantity > item.quantity && (
                <p className="text-xs text-[#C8102E] mt-2">
                  Enter a quantity less than or equal to the original amount
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Credit Total */}
        <div className="bg-[#CC0000] text-white rounded-lg p-4 flex justify-between items-center">
          <span className="text-sm">Credit Amount</span>
          <span className="text-xl font-bold">
            KES {creditTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setCurrentStep(3)}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => {
              if (validateItems()) {
                setCurrentStep(5);
              }
            }}
            className="flex-1 py-3 bg-[#CC0000] text-white rounded-lg hover:bg-[#990000] transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            Review
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Render Step 5: Final Review & Submission
  const renderStep5 = () => {
    const selectedItems = items.filter(item => item.selected && item.return_quantity > 0);
    
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-[#CC0000]">Review Credit Note</h3>

        {/* Invoice Info */}
        <div className="bg-[#F5F5F5] rounded-lg p-4 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Invoice:</span>
            <span className="font-medium">{invoice?.invoice_no}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Reason:</span>
            <span className="font-medium">{CREDIT_NOTE_REASONS.find(r => r.value === reason)?.label}</span>
          </div>
        </div>

        {/* Selected Items */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-[#CC0000] text-white px-4 py-2 text-sm font-medium">
            Items to Credit ({selectedItems.length})
          </div>
          <div className="divide-y divide-gray-100">
            {selectedItems.map(item => (
              <div key={item.item_id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{item.item_name}</p>
                    <p className="text-xs text-gray-500">
                      {item.return_quantity} × KES {item.unit_price.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="font-medium text-gray-900 text-sm">
                  KES {(item.unit_price * item.return_quantity).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Total */}
        <div className="bg-[#CC0000]/20 rounded-lg p-4 flex justify-between items-center">
          <span className="font-medium text-[#CC0000]">Total Credit Amount</span>
          <span className="text-xl font-bold text-[#CC0000]">
            KES {creditTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setCurrentStep(4)}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-[#008751] text-white rounded-lg hover:bg-[#006741] transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Credit Note
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <header className="bg-[#CC0000] shadow-lg sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#CC0000] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#CC0000]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Credit Note</h1>
                <p className="text-xs text-white/70">Kenya Revenue Authority</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-3 py-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Credit Note Submitted!</h2>
            <p className="text-sm text-gray-600 mb-4">Your credit note has been created successfully.</p>
            
            {creditNoteId && (
              <div className="bg-[#F5F5F5] rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Credit Note Reference</p>
                <p className="text-lg font-bold text-[#CC0000]">{creditNoteId}</p>
              </div>
            )}

            <div className="bg-[#F5F5F5] rounded-lg p-4 mb-6 text-left text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Invoice:</span>
                <span className="font-medium">{invoice?.invoice_no}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">{items.filter(i => i.selected).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Credit Amount:</span>
                <span className="font-bold text-[#CC0000]">
                  KES {creditTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 bg-[#CC0000] text-white rounded-lg hover:bg-[#990000] transition-colors text-sm font-medium"
            >
              Create Another Credit Note
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-[#CC0000] shadow-lg sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}
            <div className="w-9 h-9 rounded-lg bg-[#CC0000] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#CC0000]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Credit Note</h1>
              <p className="text-xs text-white/70">Kenya Revenue Authority</p>
            </div>
          </div>
        </div>
      </header>

      {/* Test Banner */}
      <div className="bg-amber-100 border-b border-amber-200 px-3 py-2">
        <p className="text-xs text-amber-800 text-center flex items-center justify-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          This flow is for testing purposes only
        </p>
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-3 py-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border-t-4 border-[#CC0000]">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map(step => (
              <div key={step} className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${
                  currentStep >= step ? 'bg-[#CC0000]' : 'bg-gray-300'
                }`} />
                {step < 5 && <div className={`w-4 h-0.5 ${currentStep > step ? 'bg-[#CC0000]' : 'bg-gray-300'}`} />}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>
      </main>
    </div>
  );
}

// Main page with Suspense
export default function CreditNotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#CC0000]" />
          <span className="text-gray-600 font-medium">Loading...</span>
        </div>
      </div>
    }>
      <CreditNoteContent />
    </Suspense>
  );
}
