"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  User,
  Building2,
  UserCircle,
  ShoppingBag,
  Package,
  Wrench,
  FileText,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Send,
  Download,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Phone,
  Mail,
  Trash2,
  Minus,
  Eye
} from 'lucide-react';
import { 
  lookupCustomer, 
  submitInvoice,
  fetchInvoices,
  InvoiceItem,
  FetchedInvoice
} from '@/app/actions/etims';

// Types
type MenuOption = 'create' | 'pending' | 'completed' | 'rejected';
type TransactionType = 'b2b' | 'b2c' | null;
type ItemType = 'products' | 'services' | null;
type InvoiceType = 'single' | 'multiple' | null;
type TaxType = 'vat' | 'non-vat';

interface Seller {
  name: string;
  pin: string;
  phone: string;
}

// Use API type for invoices
type Invoice = FetchedInvoice;

// Step Configuration for Invoice Creation
const CREATE_STEPS = [
  { num: 1, label: 'Seller', fullLabel: 'Seller Validation' },
  { num: 2, label: 'Details', fullLabel: 'Seller Details' },
  { num: 3, label: 'Tax', fullLabel: 'Tax Information' },
  { num: 4, label: 'Type', fullLabel: 'Item Type' },
  { num: 5, label: 'Items', fullLabel: 'Item Details' },
  { num: 6, label: 'Review', fullLabel: 'Review & Submit' }
];

// Progress Steps Component
const ProgressSteps = ({ currentStep, steps }: { currentStep: number; steps: typeof CREATE_STEPS }) => {
  return (
    <div className="mb-4 overflow-x-auto pb-2">
      <div className="flex items-center min-w-max">
        {steps.map((step, idx) => (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                currentStep === step.num 
                  ? 'bg-[#FFB81C] text-[#003366] ring-2 ring-[#003366] ring-offset-1' 
                  : currentStep > step.num
                  ? 'bg-[#003366] text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > step.num ? '✓' : step.num}
              </div>
              <span className={`text-[8px] sm:text-[10px] mt-1 text-center whitespace-nowrap ${
                currentStep === step.num ? 'text-[#003366] font-semibold' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 w-4 sm:w-6 mx-0.5 transition-colors ${
                currentStep > step.num ? 'bg-[#003366]' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Menu Item Component
const MenuItem = ({ 
  icon: Icon, 
  label, 
  selected, 
  onClick,
  badge
}: { 
  icon: any; 
  label: string; 
  selected: boolean; 
  onClick: () => void;
  badge?: number;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
      selected 
        ? 'border-[#FFB81C] bg-[#FFB81C]/10' 
        : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
      selected ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-500'
    }`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="flex-1 text-left font-medium text-gray-900">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="px-2 py-0.5 bg-[#C8102E] text-white text-xs font-medium rounded-full">
        {badge}
      </span>
    )}
    <ChevronRight className="w-5 h-5 text-gray-400" />
  </button>
);

// Expandable Invoice List Item Component
const ExpandableInvoiceItem = ({ 
  invoice
}: { 
  invoice: Invoice; 
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement actual PDF download
    alert(`Downloading PDF for invoice ${invoice.reference}`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all">
      {/* Header - always visible */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-[#003366]">{invoice.reference}</span>
          <span className="font-bold text-gray-900">
            KES {invoice.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-gray-600 mb-2">
          Buyer: {invoice.buyer_name}, Seller: {invoice.seller_name}
        </p>
        {invoice.status === 'rejected' && invoice.rejection_reason && (
          <p className="text-xs text-red-600 mb-2">Reason: {invoice.rejection_reason}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {expanded ? 'Tap to collapse' : 'Tap to expand'}
          </span>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#008751] text-white rounded-lg text-xs font-medium hover:bg-[#006741] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-[#F5F5F5]">
          <h4 className="text-sm font-medium text-[#003366] mb-3">Invoice Details</h4>
          
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Buyer:</span>
              <span className="font-medium text-gray-900">{invoice.buyer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Seller:</span>
              <span className="font-medium text-gray-900">{invoice.seller_name}</span>
            </div>
          </div>

          <h4 className="text-sm font-medium text-[#003366] mb-2">Items</h4>
          <div className="space-y-2 mb-4">
            {invoice.items.map((item, index) => (
              <div key={index} className="bg-white rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900">{item.item_name}</p>
                <div className="flex justify-between text-gray-600 mt-1">
                  <span>Unit price: KES {item.unit_price.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                  <span>Qty: {item.quantity}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#FFB81C]/20 rounded-lg p-3 flex justify-between items-center">
            <span className="font-medium text-[#003366]">Total Amount</span>
            <span className="text-lg font-bold text-[#003366]">
              KES {invoice.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Content Component
function BuyerInitiatedContent() {
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('number') || searchParams.get('msisdn') || '';

  // Main state
  const [currentView, setCurrentView] = useState<'menu' | 'create' | 'pending' | 'completed' | 'rejected' | 'details'>('menu');
  const [selectedMenu, setSelectedMenu] = useState<MenuOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Invoice lists (mock data for now)
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [completedInvoices, setCompletedInvoices] = useState<Invoice[]>([]);
  const [rejectedInvoices, setRejectedInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Create Invoice State
  const [createStep, setCreateStep] = useState(1);
  const [transactionType, setTransactionType] = useState<TransactionType>(null);
  const [sellerPin, setSellerPin] = useState('');
  const [seller, setSeller] = useState<Seller | null>(null);
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerEmail, setSellerEmail] = useState('');
  const [taxType, setTaxType] = useState<TaxType>('non-vat');
  const [itemType, setItemType] = useState<ItemType>(null);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<InvoiceItem>>({
    item_name: '',
    description: '',
    taxable_amount: 0,
    quantity: 1
  });
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceResult, setInvoiceResult] = useState<any>(null);

  // Calculations
  const calculateItemTotal = (price: number, qty: number) => price * qty;
  const totalAmount = items.reduce((sum, item) => sum + item.item_total, 0);

  // Handle menu selection
  const handleMenuSelect = (option: MenuOption) => {
    setSelectedMenu(option);
    setError(null);
    
    switch (option) {
      case 'create':
        resetCreateForm();
        setCurrentView('create');
        break;
      case 'pending':
        loadPendingInvoices();
        setCurrentView('pending');
        break;
      case 'completed':
        loadCompletedInvoices();
        setCurrentView('completed');
        break;
      case 'rejected':
        loadRejectedInvoices();
        setCurrentView('rejected');
        break;
    }
  };

  // Reset create form
  const resetCreateForm = () => {
    setCreateStep(1);
    setTransactionType(null);
    setSellerPin('');
    setSeller(null);
    setSellerPhone('');
    setSellerEmail('');
    setTaxType('non-vat');
    setItemType(null);
    setInvoiceType(null);
    setItems([]);
    setCurrentItem({
      item_name: '',
      description: '',
      taxable_amount: 0,
      quantity: 1
    });
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setSuccess(false);
    setInvoiceResult(null);
    setError(null);
  };

  // Load all invoices from API
  const loadInvoices = async () => {
    if (!phoneNumber) {
      setError('Phone number is required to fetch invoices');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchInvoices(phoneNumber);
      
      if (result.success && result.invoices) {
        // Filter invoices by status
        const pending = result.invoices.filter(inv => inv.status === 'pending');
        const completed = result.invoices.filter(inv => inv.status === 'completed');
        const rejected = result.invoices.filter(inv => inv.status === 'rejected');
        
        setPendingInvoices(pending);
        setCompletedInvoices(completed);
        setRejectedInvoices(rejected);
      } else {
        // No invoices found
        setPendingInvoices([]);
        setCompletedInvoices([]);
        setRejectedInvoices([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
      setPendingInvoices([]);
      setCompletedInvoices([]);
      setRejectedInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // Load invoices by status
  const loadPendingInvoices = async () => {
    await loadInvoices();
  };

  const loadCompletedInvoices = async () => {
    await loadInvoices();
  };

  const loadRejectedInvoices = async () => {
    await loadInvoices();
  };

  // Seller validation
  const handleSellerValidation = async () => {
    if (!transactionType) {
      setError('Please select a transaction type');
      return;
    }
    if (!sellerPin.trim()) {
      setError('Please enter a Seller PIN/ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await lookupCustomer(sellerPin);
      if (result.success && result.customer) {
        setSeller({
          name: result.customer.name,
          pin: result.customer.pin,
          phone: result.customer.msisdn
        });
        setSellerPhone(result.customer.msisdn);
        setCreateStep(2);
      } else {
        setError('Seller not found. Please verify the PIN/ID and try again');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate seller');
    } finally {
      setLoading(false);
    }
  };

  // Add item
  const handleAddItem = () => {
    if (!currentItem.item_name?.trim()) {
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

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Submit invoice
  const handleSubmitInvoice = async () => {
    if (!seller?.phone) {
      setError('Seller information is missing');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await submitInvoice({
        msisdn: seller.phone,
        total_amount: totalAmount,
        items: items.map(item => ({
          item_name: item.item_name,
          taxable_amount: item.taxable_amount,
          quantity: item.quantity
        }))
      });
      
      setInvoiceResult(result);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit invoice');
    } finally {
      setLoading(false);
    }
  };

  // Render main menu
  const renderMenu = () => (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-[#003366] mb-4">Select One</h2>
      
      <MenuItem
        icon={Plus}
        label="Create Invoice"
        selected={selectedMenu === 'create'}
        onClick={() => handleMenuSelect('create')}
      />
      <MenuItem
        icon={Clock}
        label="View Pending Invoices"
        selected={selectedMenu === 'pending'}
        onClick={() => handleMenuSelect('pending')}
      />
      <MenuItem
        icon={CheckCircle2}
        label="View Completed Invoices"
        selected={selectedMenu === 'completed'}
        onClick={() => handleMenuSelect('completed')}
      />
      <MenuItem
        icon={XCircle}
        label="View Rejected Invoices"
        selected={selectedMenu === 'rejected'}
        onClick={() => handleMenuSelect('rejected')}
      />

      <p className="text-xs text-gray-500 text-center mt-4">Tap to select an item</p>
    </div>
  );

  // Render invoice creation step content
  const renderCreateStep = () => {
    switch (createStep) {
      case 1: // Seller Validation
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type <span className="text-[#C8102E]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTransactionType('b2b')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    transactionType === 'b2b'
                      ? 'border-[#FFB81C] bg-[#FFB81C]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building2 className={`w-6 h-6 mx-auto mb-1 ${transactionType === 'b2b' ? 'text-[#003366]' : 'text-gray-400'}`} />
                  <p className="text-sm font-medium">B2B</p>
                  <p className="text-[10px] text-gray-500">Business to Business</p>
                </button>
                <button
                  onClick={() => setTransactionType('b2c')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    transactionType === 'b2c'
                      ? 'border-[#FFB81C] bg-[#FFB81C]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <UserCircle className={`w-6 h-6 mx-auto mb-1 ${transactionType === 'b2c' ? 'text-[#003366]' : 'text-gray-400'}`} />
                  <p className="text-sm font-medium">B2C</p>
                  <p className="text-[10px] text-gray-500">Business to Customer</p>
                </button>
              </div>
            </div>

            {transactionType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Seller PIN/ID <span className="text-[#C8102E]">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={sellerPin}
                      onChange={(e) => setSellerPin(e.target.value)}
                      placeholder="Enter PIN or ID"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSellerValidation}
                    disabled={loading}
                    className="px-4 py-3 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Validate'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Click Validate for auto populating</p>
              </div>
            )}
          </div>
        );

      case 2: // Seller Details
        return (
          <div className="space-y-4">
            <div className="bg-[#F5F5F5] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[#003366] mb-3">Seller Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">PIN/ID:</span>
                  <span className="font-medium text-gray-900">{seller?.pin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-900">{seller?.name}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-[#C8102E]">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  placeholder="254XXXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address (optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={sellerEmail}
                  onChange={(e) => setSellerEmail(e.target.value)}
                  placeholder="seller@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!sellerPhone.trim()) {
                  setError('Phone number is required');
                  return;
                }
                setError(null);
                setCreateStep(3);
              }}
              className="w-full py-3 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium"
            >
              Continue
            </button>
          </div>
        );

      case 3: // Tax Information
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Tax <span className="text-[#C8102E]">*</span>
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setTaxType('vat')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                    taxType === 'vat'
                      ? 'border-[#FFB81C] bg-[#FFB81C]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    taxType === 'vat' ? 'border-[#003366]' : 'border-gray-300'
                  }`}>
                    {taxType === 'vat' && <div className="w-3 h-3 rounded-full bg-[#003366]" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">VAT</p>
                    <p className="text-xs text-gray-500">Value Added Tax (16%)</p>
                  </div>
                </button>
                <button
                  onClick={() => setTaxType('non-vat')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                    taxType === 'non-vat'
                      ? 'border-[#FFB81C] bg-[#FFB81C]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    taxType === 'non-vat' ? 'border-[#003366]' : 'border-gray-300'
                  }`}>
                    {taxType === 'non-vat' && <div className="w-3 h-3 rounded-full bg-[#003366]" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Non-VAT</p>
                    <p className="text-xs text-gray-500">VAT-exempt goods/services</p>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={() => setCreateStep(4)}
              className="w-full py-3 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium"
            >
              Continue
            </button>
          </div>
        );

      case 4: // Item Type & Invoice Type
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setItemType('products')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    itemType === 'products'
                      ? 'border-[#FFB81C] bg-[#FFB81C]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Package className={`w-8 h-8 mx-auto mb-2 ${itemType === 'products' ? 'text-[#003366]' : 'text-gray-400'}`} />
                  <p className="font-medium text-gray-900">Products</p>
                  <p className="text-[10px] text-gray-500">Physical goods</p>
                </button>
                <button
                  onClick={() => setItemType('services')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    itemType === 'services'
                      ? 'border-[#FFB81C] bg-[#FFB81C]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Wrench className={`w-8 h-8 mx-auto mb-2 ${itemType === 'services' ? 'text-[#003366]' : 'text-gray-400'}`} />
                  <p className="font-medium text-gray-900">Services</p>
                  <p className="text-[10px] text-gray-500">Non-physical items</p>
                </button>
              </div>
            </div>

            {itemType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setInvoiceType('single')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      invoiceType === 'single'
                        ? 'border-[#FFB81C] bg-[#FFB81C]/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">Single Item</p>
                    <p className="text-[10px] text-gray-500">One item only</p>
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
                    <p className="text-[10px] text-gray-500">Two or more</p>
                  </button>
                </div>
              </div>
            )}

            {itemType && invoiceType && (
              <button
                onClick={() => setCreateStep(5)}
                className="w-full py-3 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium"
              >
                Continue
              </button>
            )}
          </div>
        );

      case 5: // Item Information
        return (
          <div className="space-y-4">
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
                  placeholder="Enter name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={currentItem.description || ''}
                  onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})}
                  placeholder="Add description"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price <span className="text-[#C8102E]">*</span></label>
                  <input
                    type="number"
                    value={currentItem.taxable_amount || ''}
                    onChange={(e) => setCurrentItem({...currentItem, taxable_amount: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity <span className="text-[#C8102E]">*</span></label>
                  <input
                    type="number"
                    value={currentItem.quantity || 1}
                    onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 1})}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] text-sm"
                  />
                </div>
              </div>

              {(currentItem.taxable_amount || 0) > 0 && (
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-600">Total: <span className="font-bold text-[#003366]">
                    KES {calculateItemTotal(currentItem.taxable_amount || 0, currentItem.quantity || 1).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span></p>
                </div>
              )}

              <button
                onClick={handleAddItem}
                className="w-full py-2 bg-[#FFB81C] text-[#003366] rounded-lg hover:bg-[#D4A017] transition-colors text-sm font-medium"
              >
                {invoiceType === 'multiple' ? 'Save and Add More Item' : 'Add to Invoice'}
              </button>
            </div>

            {items.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[#003366] mb-2">Added Items ({items.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {items.map((item, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.item_name}</p>
                        <p className="text-xs text-gray-500">
                          KES {item.taxable_amount.toLocaleString()} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#003366]">
                          KES {item.item_total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </span>
                        <button onClick={() => handleRemoveItem(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#003366] text-white rounded-lg p-3 mt-3 flex justify-between items-center">
                  <span className="text-sm">Total Amount</span>
                  <span className="text-lg font-bold">KES {totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                </div>

                <button
                  onClick={() => setCreateStep(6)}
                  className="w-full py-3 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium mt-3"
                >
                  Continue to Review
                </button>
              </div>
            )}

            {invoiceType === 'multiple' && items.length > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                After adding the last item, click "Continue to Review" to proceed.
              </p>
            )}
          </div>
        );

      case 6: // Review & Submit
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[#003366]">
              Invoice Preview - {invoiceType === 'single' ? 'Single' : 'Multi'} Item
            </h3>

            <div className="bg-[#F5F5F5] rounded-lg p-3">
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Seller:</span> <span className="font-medium">{seller?.name}</span></p>
                <p><span className="text-gray-600">PIN:</span> <span className="font-medium">{seller?.pin}</span></p>
                <p><span className="text-gray-600">Tax Type:</span> <span className="font-medium">{taxType === 'vat' ? 'VAT' : 'Non-VAT'}</span></p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-[#003366] text-white px-3 py-2 text-sm font-medium">Select Items</div>
              <div className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <div key={index} className="p-3 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{item.item_name}</p>
                      <p className="text-xs text-gray-500">Unit Price: {item.taxable_amount}, Quantity: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">Total: {item.item_total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#FFB81C]/20 rounded-lg p-4 flex justify-between items-center">
              <span className="font-medium text-[#003366]">Total Amount :</span>
              <span className="text-xl font-bold text-[#003366]">
                {totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={() => setCreateStep(5)}
              className="w-full py-2 text-[#008751] text-sm font-medium"
            >
              + Add New Item
            </button>

            <button
              onClick={handleSubmitInvoice}
              disabled={loading}
              className="w-full py-3 bg-[#008751] text-white rounded-lg hover:bg-[#006741] transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit
                </>
              )}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Render invoice list
  const renderInvoiceList = (invoices: Invoice[], title: string, status: 'pending' | 'completed' | 'rejected') => (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#003366]">{title}</h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#003366]" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600">No {status} invoices found</p>
          <button
            onClick={() => handleMenuSelect('create')}
            className="mt-4 px-4 py-2 bg-[#003366] text-white rounded-lg text-sm font-medium"
          >
            Create New Invoice
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <ExpandableInvoiceItem
              key={invoice.invoice_id}
              invoice={invoice}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Render invoice details
  const renderInvoiceDetails = () => {
    if (!selectedInvoice) return null;

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#003366]">Invoice Details</h2>

        <div className="bg-[#F5F5F5] rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Buyer Name:</span>
            <span className="font-medium text-gray-900">{selectedInvoice.buyer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Supplier Name:</span>
            <span className="font-medium text-gray-900">{selectedInvoice.seller_name}</span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-[#003366] mb-2">Items :</h3>
          <div className="space-y-2">
            {selectedInvoice.items.map((item, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                <p>Product name: {item.item_name}</p>
                <p>Unit price: {item.unit_price.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                <p>Quantity: {item.quantity.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#FFB81C]/20 rounded-lg p-4 flex justify-between items-center">
          <span className="font-medium text-[#003366]">Total Amount :</span>
          <span className="text-xl font-bold text-[#003366]">
            {selectedInvoice.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex gap-3">
          <button className="flex-1 py-3 bg-[#008751] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={() => setCurrentView(selectedInvoice.status as any)}
            className="px-4 py-3 bg-[#003366] text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => {
            setSelectedInvoice(null);
            setCurrentView('menu');
          }}
          className="w-full py-3 bg-[#008751] text-white rounded-lg text-sm font-medium"
        >
          Finish
        </button>
      </div>
    );
  };

  // Success state
  if (success && currentView === 'create') {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <header className="bg-[#003366] shadow-lg sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FFB81C] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#003366]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Buyer Initiated Invoice</h1>
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invoice Created!</h2>
            <p className="text-sm text-gray-600 mb-4">Your invoice has been submitted successfully.</p>
            
            {invoiceResult?.invoice_id && (
              <div className="bg-[#F5F5F5] rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Invoice Reference</p>
                <p className="text-lg font-bold text-[#003366]">{invoiceResult.invoice_id}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleMenuSelect('pending')}
                className="flex-1 py-3 border border-[#003366] text-[#003366] rounded-lg text-sm font-medium"
              >
                View Invoices
              </button>
              <button
                onClick={() => {
                  resetCreateForm();
                  setCurrentView('create');
                }}
                className="flex-1 py-3 bg-[#003366] text-white rounded-lg text-sm font-medium"
              >
                Create Another
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-[#003366] shadow-lg sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3">
            {currentView !== 'menu' && (
              <button
                onClick={() => currentView === 'details' ? setCurrentView(selectedInvoice?.status as any || 'menu') : setCurrentView('menu')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}
            <div className="w-9 h-9 rounded-lg bg-[#FFB81C] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#003366]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Buyer Initiated Invoice</h1>
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
        <div className="bg-white rounded-xl shadow-lg p-4 border-t-4 border-[#FFB81C]">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Content based on view */}
          {currentView === 'menu' && renderMenu()}
          
          {currentView === 'create' && renderCreateStep()}
          
          {currentView === 'pending' && renderInvoiceList(pendingInvoices, 'Pending Invoices', 'pending')}
          {currentView === 'completed' && renderInvoiceList(completedInvoices, 'Completed Invoices', 'completed')}
          {currentView === 'rejected' && renderInvoiceList(rejectedInvoices, 'Rejected Invoices', 'rejected')}
          {currentView === 'details' && renderInvoiceDetails()}
        </div>
      </main>
    </div>
  );
}

// Main page with Suspense
export default function BuyerInitiatedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#003366]" />
          <span className="text-gray-600 font-medium">Loading...</span>
        </div>
      </div>
    }>
      <BuyerInitiatedContent />
    </Suspense>
  );
}
