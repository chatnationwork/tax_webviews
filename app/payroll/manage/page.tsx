'use client';

import { useState, useCallback, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  User, 
  Briefcase, 
  DollarSign, 
  Calendar,
  Phone,
  Mail,
  Hash,
  Building2,
  FileText,
  Save,
  X,
  Edit3,
  CheckCircle,
  AlertCircle,
  Shield,
  UserX,
  UserMinus,
  UserCheck,
  RefreshCw,
  XCircle,
  ArrowLeft
} from 'lucide-react';
import { 
  searchEmployees, 
  updateEmployee, 
  deactivateEmployee, 
  terminateEmployee, 
  reinstateEmployee,
  Employee, 
  SearchEmployeesResult 
} from '../../actions/payroll';
import { getStoredPhoneServer } from '@/app/actions/auth';
import { getKnownPhone, saveKnownPhone } from '@/app/_lib/session-store';

// Toast notification type
type ToastType = 'success' | 'error';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

// Toast Component
const ToastNotification = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-sm animate-slide-in ${
      toast.type === 'success' 
        ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' 
        : 'bg-red-50/95 border-red-200 text-red-800'
    }`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        toast.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
      }`}>
        {toast.type === 'success' 
          ? <CheckCircle className="w-5 h-5 text-emerald-600" />
          : <XCircle className="w-5 h-5 text-red-600" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{toast.title}</p>
        <p className="text-xs mt-0.5 opacity-90">{toast.message}</p>
      </div>
      <button 
        onClick={onClose}
        className="flex-shrink-0 p-1 hover:bg-black/10 rounded-full transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Editable fields configuration
const EDITABLE_FIELDS = [
  { key: 'msisdn', label: 'Phone Number', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'department', label: 'Department', type: 'text' },
  { key: 'profession', label: 'Profession', type: 'text' },
  { key: 'salary', label: 'Basic Salary', type: 'number', apiKey: 'basic_salary' },
  { key: 'contract_type', label: 'Contract Type', type: 'select', options: ['permanent', 'fixed-term', 'contract', 'part-time'] },
  { key: 'date_of_completion', label: 'Contract End Date', type: 'date' },
  { key: 'nssf_no', label: 'NSSF Number', type: 'text' },
  { key: 'shif_no', label: 'SHIF Number', type: 'text' },
];

type ActionType = 'edit' | 'deactivate' | 'terminate' | 'reinstate' | null;

const generateEmploymentNo = () => {
  const prefix = 'EMP';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

// Employee Card Component (simplified from original)
const EmployeeCard = ({ 
  employee, 
  onUpdate,
  onShowToast 
}: { 
  employee: Employee; 
  onUpdate: () => void;
  onShowToast: (type: ToastType, title: string, message: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [editedFields, setEditedFields] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [deactivationReason, setDeactivationReason] = useState('');
  const [terminationReason, setTerminationReason] = useState('');
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEmploymentNo, setNewEmploymentNo] = useState(generateEmploymentNo());

  const handleFieldChange = (key: string, value: any) => {
    setEditedFields(prev => ({ ...prev, [key]: value }));
    setSaveError(null);
  };

  const resetActionState = () => {
    setSelectedAction(null);
    setEditedFields({});
    setSaveError(null);
    setDeactivationReason('');
    setTerminationReason('');
    setTerminationDate(new Date().toISOString().split('T')[0]);
    setNewEmploymentNo(generateEmploymentNo());
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      switch (selectedAction) {
        case 'edit':
          if (Object.keys(editedFields).length === 0) {
            resetActionState();
            return;
          }
          const apiPayload: Record<string, any> = {};
          for (const [key, value] of Object.entries(editedFields)) {
            const fieldConfig = EDITABLE_FIELDS.find(f => f.key === key);
            const apiKey = fieldConfig?.apiKey || key;
            apiPayload[apiKey] = value;
          }
          await updateEmployee(employee.uuid, apiPayload);
          break;
          
        case 'deactivate':
          if (!deactivationReason.trim()) {
            setSaveError('Please provide a reason for deactivation');
            setSaving(false);
            return;
          }
          await deactivateEmployee(employee.uuid, deactivationReason);
          break;
          
        case 'terminate':
          if (!terminationReason.trim()) {
            setSaveError('Please provide a reason for termination');
            setSaving(false);
            return;
          }
          await terminateEmployee(employee.uuid, terminationReason, new Date(terminationDate).toISOString());
          break;
          
        case 'reinstate':
          if (!newEmploymentNo.trim()) {
            setSaveError('Please provide a new employment number');
            setSaving(false);
            return;
          }
          await reinstateEmployee(employee.uuid, newEmploymentNo);
          break;
      }
      
      onShowToast('success', 'Action Successful', `Employee action completed successfully.`);
      resetActionState();
      onUpdate();
    } catch (error: any) {
      setSaveError(error.message || 'Action failed');
      onShowToast('error', 'Action Failed', error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: string | number, currency: string = 'KES') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${currency} ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div 
        className="p-4 cursor-pointer bg-gradient-to-r from-slate-50 to-white"
        onClick={() => !selectedAction && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {employee.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-gray-900 truncate">{employee.name}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{employee.pin}</span>
                <span>•</span>
                <span>{employee.employment_no}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              employee.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {employee.status}
            </span>
            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-xs text-gray-500">Gross Pay</p>
              <p className="text-xs font-semibold">{formatCurrency(employee.gross_pay)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Net Pay</p>
              <p className="text-xs font-semibold">{formatCurrency(employee.net_pay)}</p>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {['edit', 'deactivate', 'terminate', 'reinstate'].map((action) => (
              <button
                key={action}
                onClick={() => setSelectedAction(selectedAction === action ? null : action as ActionType)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs ${
                  selectedAction === action 
                    ? action === 'edit' ? 'border-indigo-500 bg-indigo-50' 
                    : action === 'deactivate' ? 'border-amber-500 bg-amber-50'
                    : action === 'terminate' ? 'border-red-500 bg-red-50'
                    : 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {action === 'edit' && <Edit3 className="w-4 h-4" />}
                {action === 'deactivate' && <UserMinus className="w-4 h-4" />}
                {action === 'terminate' && <UserX className="w-4 h-4" />}
                {action === 'reinstate' && <UserCheck className="w-4 h-4" />}
                <span className="capitalize">{action}</span>
              </button>
            ))}
          </div>

          {/* Action Forms */}
          {selectedAction === 'deactivate' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <textarea
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={2}
                placeholder="Reason for deactivation..."
              />
            </div>
          )}

          {selectedAction === 'terminate' && (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={2}
                  placeholder="Reason for termination..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Termination Date *</label>
                <input
                  type="date"
                  value={terminationDate}
                  onChange={(e) => setTerminationDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          {selectedAction === 'reinstate' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">New Employment No *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEmploymentNo}
                  onChange={(e) => setNewEmploymentNo(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <button
                  onClick={() => setNewEmploymentNo(generateEmploymentNo())}
                  className="p-2 bg-gray-100 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {saveError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-xs text-red-600">{saveError}</p>
            </div>
          )}

          {selectedAction && (
            <div className="flex gap-2">
              <button
                onClick={resetActionState}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[var(--kra-red)] text-white rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          )}

          {/* Employee Details */}
          {!selectedAction && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded-lg border">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm">{employee.msisdn || 'N/A'}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm truncate">{employee.email || 'N/A'}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border">
                  <p className="text-xs text-gray-500">Contract</p>
                  <p className="text-sm capitalize">{employee.contract_type}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border">
                  <p className="text-xs text-gray-500">Tax Due</p>
                  <p className="text-sm text-red-600">{formatCurrency(employee.tax_due)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Page Content
function ManageEmployeesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const [checkingSession, setCheckingSession] = useState(true);

  // Check session on mount
  useEffect(() => {
    const performSessionCheck = async () => {
      try {
        let currentPhone = phone;
        
        if (!currentPhone) {
          try {
            const localPhone = getKnownPhone();
            if (localPhone) currentPhone = localPhone;
          } catch (e) {
            console.error('Error accessing localStorage', e);
          }
        }
        
        if (!currentPhone) {
          const storedPhone = await getStoredPhoneServer();
          if (storedPhone) currentPhone = storedPhone;
        }
        
        if (currentPhone) {
          if (currentPhone !== phone) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('phone', currentPhone);
            router.replace(`${window.location.pathname}?${params.toString()}`);
          }
          saveKnownPhone(currentPhone);
        }
        
        setCheckingSession(false);
      } catch (err) {
        console.error('Phone check failed', err);
        setCheckingSession(false);
      }
    };
    
    performSessionCheck();
  }, [phone, router, searchParams]);
  
  const [searchQuery, setSearchQuery] = useState('');

  const [results, setResults] = useState<SearchEmployeesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);
  
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleSearch = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!searchQuery.trim()) {
      setError('Please enter a name or KRA PIN');
      return;
    }

    const setLoadingState = page === 1 ? setLoading : setLoadingMore;
    setLoadingState(true);
    setError(null);

    try {
      const data = await searchEmployees(searchQuery.trim(), page, 5);
      if (append && results) {
        setResults({ ...data, entries: [...results.entries, ...data.entries] });
      } else {
        setResults(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search');
    } finally {
      setLoadingState(false);
    }
  }, [searchQuery, results]);

  const buildBackUrl = () => {
    const params = new URLSearchParams();
    if (phone) params.set('phone', phone);
    return `/payroll?${params.toString()}`;
  };

  // Redirect to OTP if no token (only after session check)
  useEffect(() => {
  }, [phone, router, checkingSession]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md text-center">
          <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Phone Number Required</h2>
          <p className="text-sm text-gray-600">Please access this page via WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[var(--kra-black)] text-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => router.push(buildBackUrl())} className="p-1.5 hover:bg-gray-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-medium">Manage Employees</h1>
            <p className="text-xs text-gray-400">Search and manage payroll</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 py-4">
        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border-t-4 border-[var(--kra-red)]">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Name or KRA PIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-4 py-2.5 bg-[var(--kra-red)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {results && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Showing {results.entries.length} of {results.total_entries}
            </p>
            {results.entries.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onUpdate={() => handleSearch()}
                onShowToast={showToast}
              />
            ))}
            {results.page_number < results.total_pages && (
              <button
                onClick={() => handleSearch(results.page_number + 1, true)}
                disabled={loadingMore}
                className="w-full py-3 bg-white border-2 border-gray-200 text-gray-600 rounded-lg text-sm"
              >
                {loadingMore ? 'Loading...' : `Load More (${results.total_entries - results.entries.length} remaining)`}
              </button>
            )}
          </div>
        )}

        {!results && !loading && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Enter a name or KRA PIN to search</p>
          </div>
        )}
      </main>

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-50 space-y-2">
          {toasts.map((toast) => (
            <ToastNotification key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManageEmployeesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    }>
      <ManageEmployeesContent />
    </Suspense>
  );
}
