"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  User, 
  ShoppingBag, 
  FileText, 
  Package, 
  Wrench,
  Plus,
  Minus,
  CheckCircle, 
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Receipt,
  Send,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { 
  lookupCustomer, 
  submitInvoice,
  CustomerLookupResult,
  InvoiceItem,
  InvoiceSubmissionRequest
} from '@/app/actions/etims';

// Step configuration
const STEPS = [
  { num: 1, label: 'Customer', fullLabel: 'Customer Lookup' },
  { num: 2, label: 'Details', fullLabel: 'General Details' },
  { num: 3, label: 'Type', fullLabel: 'Item Type' },
  { num: 4, label: 'Items', fullLabel: 'Item Details' },
  { num: 5, label: 'Review', fullLabel: 'Review & Submit' }
];

// Progress Steps Component
const ProgressSteps = ({ currentStep }: { currentStep: number }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => (
          <div key={step.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                currentStep === step.num 
                  ? 'bg-[#FFB81C] text-[#003366] ring-2 ring-[#003366] ring-offset-2' 
                  : currentStep > step.num
                  ? 'bg-[#003366] text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > step.num ? '✓' : step.num}
              </div>
              <span className={`text-[9px] sm:text-xs mt-1 text-center ${
                currentStep === step.num ? 'text-[#003366] font-semibold' : 'text-gray-500'
              }`}>
                <span className="hidden sm:inline">{step.fullLabel}</span>
                <span className="sm:hidden">{step.label}</span>
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 w-full mx-1 transition-colors ${
                currentStep > step.num ? 'bg-[#003366]' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Sales Invoice Content
function SalesInvoiceContent() {
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('number') || searchParams.get('msisdn') || '';

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<any>(null);

  // Step 1: Customer lookup
  const [pinOrId, setPinOrId] = useState('');
  const [customer, setCustomer] = useState<CustomerLookupResult['customer'] | null>(null);

  // Step 2: General details
  const [notes, setNotes] = useState('');

  // Step 3: Item type
  const [itemType, setItemType] = useState<'products' | 'services' | null>(null);

  // Step 4: Items
  const [invoiceType, setInvoiceType] = useState<'single' | 'multiple' | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<InvoiceItem>>({
    item_name: '',
    description: '',
    taxable_amount: 0,
    quantity: 1
  });

  // Calculate totals
  const calculateItemTotal = (price: number, qty: number) => price * qty;
  const totalAmount = items.reduce((sum, item) => sum + item.item_total, 0);

  // Step 1: Customer Lookup
  const handleCustomerLookup = async () => {
    if (!pinOrId.trim()) {
      setError('Please enter a PIN or ID number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await lookupCustomer(pinOrId);
      if (result.success && result.customer) {
        setCustomer(result.customer);
        setCurrentStep(2);
      } else {
        setError(result.error || 'Customer not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to lookup customer');
    } finally {
      setLoading(false);
    }
  };

  // Add item to list
  const handleAddItem = () => {
    if (!currentItem.item_name || currentItem.item_name.trim() === '') {
      setError('Item name is required');
      return;
    }
    if (!currentItem.taxable_amount || currentItem.taxable_amount <= 0) {
      setError('Please enter a valid price greater than 0');
      return;
    }
    if (!currentItem.quantity || currentItem.quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    const newItem: InvoiceItem = {
      item_name: currentItem.item_name.trim(),
      description: currentItem.description?.trim(),
      taxable_amount: currentItem.taxable_amount,
      quantity: Math.floor(currentItem.quantity),
      item_total: calculateItemTotal(currentItem.taxable_amount, Math.floor(currentItem.quantity))
    };

    setItems([...items, newItem]);
    setCurrentItem({
      item_name: '',
      description: '',
      taxable_amount: 0,
      quantity: 1
    });
    setError(null);
  };

  // Remove item from list
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Submit invoice
  const handleSubmitInvoice = async () => {
    if (!customer?.msisdn) {
      setError('Customer information is missing');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: InvoiceSubmissionRequest = {
        msisdn: customer.msisdn,
        total_amount: totalAmount,
        items: items.map(item => ({
          item_name: item.item_name,
          taxable_amount: item.taxable_amount,
          quantity: item.quantity
        }))
      };

      const result = await submitInvoice(request);
      setInvoiceResult(result);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit invoice');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setCurrentStep(1);
    setPinOrId('');
    setCustomer(null);
    setNotes('');
    setItemType(null);
    setInvoiceType(null);
    setItems([]);
    setCurrentItem({
      item_name: '',
      description: '',
      taxable_amount: 0,
      quantity: 1
    });
    setSuccess(false);
    setInvoiceResult(null);
    setError(null);
  };

  // Navigate steps
  const goToStep = (step: number) => {
    if (step >= 1 && step <= 5) {
      setCurrentStep(step);
      setError(null);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!customer;
      case 2: return true; // Optional step
      case 3: return !!itemType;
      case 4: return items.length > 0;
      case 5: return true;
      default: return false;
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN / ID Number <span className="text-[#C8102E]">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={pinOrId}
                    onChange={(e) => setPinOrId(e.target.value)}
                    placeholder="Enter PIN or ID number"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomerLookup()}
                  />
                </div>
                <button
                  onClick={handleCustomerLookup}
                  disabled={loading}
                  className="px-4 sm:px-6 py-3 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span className="hidden sm:inline">Lookup</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {customer && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Customer Found</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-600">Name:</span> <span className="font-medium text-gray-900">{customer.name}</span></p>
                  <p><span className="text-gray-600">PIN:</span> <span className="font-medium text-gray-900">{customer.pin}</span></p>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="bg-[#F5F5F5] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[#003366] mb-3">Customer Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">PIN:</span>
                  <span className="font-medium text-gray-900">{customer?.pin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-900">{customer?.name}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any internal reference or notes..."
                maxLength={250}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm resize-none"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">{250 - notes.length} characters left</p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">Select the type of items for this invoice:</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => { setItemType('products'); setInvoiceType(null); }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  itemType === 'products'
                    ? 'border-[#FFB81C] bg-[#FFB81C]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    itemType === 'products' ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Products</p>
                    <p className="text-xs text-gray-500">Physical goods & inventory items</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setItemType('services'); setInvoiceType(null); }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  itemType === 'services'
                    ? 'border-[#FFB81C] bg-[#FFB81C]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    itemType === 'services' ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Services</p>
                    <p className="text-xs text-gray-500">Labor, consultations & non-physical items</p>
                  </div>
                </div>
              </button>
            </div>

            {itemType && (
              <>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-sm text-gray-600 mb-3">How many items will this invoice contain?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setInvoiceType('single')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        invoiceType === 'single'
                          ? 'border-[#FFB81C] bg-[#FFB81C]/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900">Single Item</p>
                      <p className="text-xs text-gray-500">One {itemType === 'products' ? 'product' : 'service'}</p>
                    </button>

                    <button
                      onClick={() => setInvoiceType('multiple')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        invoiceType === 'multiple'
                          ? 'border-[#FFB81C] bg-[#FFB81C]/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900">Multiple Items</p>
                      <p className="text-xs text-gray-500">Two or more items</p>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {/* Current item form */}
            <div className="bg-[#F5F5F5] rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-[#003366]">
                {itemType === 'products' ? 'Product' : 'Service'} Details
              </h3>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {itemType === 'products' ? 'Product' : 'Service'} Name <span className="text-[#C8102E]">*</span>
                </label>
                <input
                  type="text"
                  value={currentItem.item_name || ''}
                  onChange={(e) => setCurrentItem({...currentItem, item_name: e.target.value})}
                  placeholder={itemType === 'products' ? 'e.g., Laptop, Office Chair' : 'e.g., Massage, Consultation'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={currentItem.description || ''}
                  onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})}
                  placeholder="Add a description..."
                  maxLength={600}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Price per Item <span className="text-[#C8102E]">*</span>
                  </label>
                  <input
                    type="number"
                    value={currentItem.taxable_amount || ''}
                    onChange={(e) => setCurrentItem({...currentItem, taxable_amount: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Quantity <span className="text-[#C8102E]">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentItem({...currentItem, quantity: Math.max(1, (currentItem.quantity || 1) - 1)})}
                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={currentItem.quantity || 1}
                      onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 1})}
                      min="1"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm text-center"
                    />
                    <button
                      onClick={() => setCurrentItem({...currentItem, quantity: (currentItem.quantity || 1) + 1})}
                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {(currentItem.taxable_amount || 0) > 0 && (currentItem.quantity || 0) > 0 && (
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600">Item Total</p>
                  <p className="text-xl font-bold text-[#003366]">
                    KES {calculateItemTotal(currentItem.taxable_amount || 0, currentItem.quantity || 1).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              <button
                onClick={handleAddItem}
                className="w-full py-2.5 bg-[#FFB81C] text-[#003366] rounded-lg hover:bg-[#D4A017] transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {invoiceType === 'multiple' ? 'Add Item' : 'Add to Invoice'}
              </button>
            </div>

            {/* Items list */}
            {items.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[#003366] mb-2">Added Items ({items.length})</h3>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.item_name}</p>
                        <p className="text-xs text-gray-500">
                          KES {item.taxable_amount.toLocaleString()} × {item.quantity} = KES {item.item_total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-[#003366] text-white rounded-lg p-4 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Amount</span>
                    <span className="text-xl font-bold">
                      KES {totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {invoiceType === 'multiple' && items.length > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                After adding the last item, click "Continue" (not "Add Item") to proceed to review.
              </p>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            {/* Customer info */}
            <div className="bg-[#F5F5F5] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[#003366] mb-3">Customer</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">PIN:</span>
                  <span className="font-medium text-gray-900">{customer?.pin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-900">{customer?.name}</span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-[#003366] text-white px-4 py-2">
                <h3 className="text-sm font-medium">Invoice Items</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <div key={index} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{item.item_name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity} × KES {item.taxable_amount.toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900 text-sm">
                      KES {item.item_total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="bg-[#FFB81C]/20 px-4 py-3 flex items-center justify-between">
                <span className="font-medium text-[#003366]">Total Amount</span>
                <span className="text-xl font-bold text-[#003366]">
                  KES {totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmitInvoice}
              disabled={loading}
              className="w-full py-3 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Invoice
                </>
              )}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <header className="bg-[#003366] shadow-lg sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#FFB81C] flex items-center justify-center">
                <Receipt className="w-5 h-5 text-[#003366]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">eTIMS Sales Invoice</h1>
                <p className="text-xs text-white/70 hidden sm:block">Kenya Revenue Authority</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-3 sm:px-4 py-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invoice Submitted!</h2>
            <p className="text-sm text-gray-600 mb-4">Your sales invoice has been created successfully.</p>
            
            {invoiceResult?.invoice_id && (
              <div className="bg-[#F5F5F5] rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Invoice Reference</p>
                <p className="text-lg font-bold text-[#003366]">{invoiceResult.invoice_id}</p>
              </div>
            )}

            <div className="bg-[#F5F5F5] rounded-lg p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium text-gray-900">{customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Items:</span>
                  <span className="font-medium text-gray-900">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-bold text-[#003366]">KES {totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium"
            >
              Create New Invoice
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-[#003366] shadow-lg sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#FFB81C] flex items-center justify-center">
              <Receipt className="w-5 h-5 text-[#003366]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">eTIMS Sales Invoice</h1>
              <p className="text-xs text-white/70 hidden sm:block">Kenya Revenue Authority</p>
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
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-t-4 border-[#FFB81C]">
          <ProgressSteps currentStep={currentStep} />

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step content */}
          {renderStepContent()}

          {/* Navigation */}
          {currentStep > 1 && currentStep < 5 && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => goToStep(currentStep - 1)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              {((currentStep === 3 && itemType && invoiceType) || (currentStep === 4 && items.length > 0)) && (
                <button
                  onClick={() => goToStep(currentStep + 1)}
                  className="flex-1 py-2.5 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => goToStep(1)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => goToStep(3)}
                className="flex-1 py-2.5 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {currentStep === 5 && (
            <button
              onClick={() => goToStep(4)}
              className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2 mt-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Edit Items
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

// Main page component with Suspense
export default function SalesInvoicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#003366]" />
          <span className="text-gray-600 font-medium">Loading...</span>
        </div>
      </div>
    }>
      <SalesInvoiceContent />
    </Suspense>
  );
}
