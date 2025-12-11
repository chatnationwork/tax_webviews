"use client";

import { useState, useCallback, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  XCircle
} from 'lucide-react';
import { 
  searchEmployees, 
  updateEmployee, 
  deactivateEmployee, 
  terminateEmployee, 
  reinstateEmployee,
  Employee, 
  SearchEmployeesResult 
} from '../actions/payroll';

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

// Editable fields configuration - fields that users are typically allowed to edit
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

// Action types
type ActionType = 'edit' | 'deactivate' | 'terminate' | 'reinstate' | null;

// Generate random employment number
const generateEmploymentNo = () => {
  const prefix = 'EMP';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

// Employee Card Component
const EmployeeCard = ({ 
  employee, 
  token, 
  onUpdate,
  onShowToast 
}: { 
  employee: Employee; 
  token: string; 
  onUpdate: () => void;
  onShowToast: (type: ToastType, title: string, message: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [editedFields, setEditedFields] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Action-specific form fields
  const [deactivationReason, setDeactivationReason] = useState('');
  const [terminationReason, setTerminationReason] = useState('');
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEmploymentNo, setNewEmploymentNo] = useState(generateEmploymentNo());

  const handleFieldChange = (key: string, value: any) => {
    setEditedFields(prev => ({ ...prev, [key]: value }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const resetActionState = () => {
    setSelectedAction(null);
    setEditedFields({});
    setSaveError(null);
    setSaveSuccess(false);
    setDeactivationReason('');
    setTerminationReason('');
    setTerminationDate(new Date().toISOString().split('T')[0]);
    setNewEmploymentNo(generateEmploymentNo());
  };

  const getActionLabel = (action: ActionType) => {
    switch (action) {
      case 'edit': return 'updated';
      case 'deactivate': return 'deactivated';
      case 'terminate': return 'terminated';
      case 'reinstate': return 'reinstated';
      default: return 'updated';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      switch (selectedAction) {
        case 'edit':
          if (Object.keys(editedFields).length === 0) {
            resetActionState();
            return;
          }
          // Map fields to API keys if different
          const apiPayload: Record<string, any> = {};
          for (const [key, value] of Object.entries(editedFields)) {
            const fieldConfig = EDITABLE_FIELDS.find(f => f.key === key);
            const apiKey = fieldConfig?.apiKey || key;
            apiPayload[apiKey] = value;
          }
          await updateEmployee(token, employee.uuid, apiPayload);
          break;
          
        case 'deactivate':
          if (!deactivationReason.trim()) {
            setSaveError('Please provide a reason for deactivation');
            setSaving(false);
            return;
          }
          await deactivateEmployee(token, employee.uuid, deactivationReason);
          break;
          
        case 'terminate':
          if (!terminationReason.trim()) {
            setSaveError('Please provide a reason for termination');
            setSaving(false);
            return;
          }
          await terminateEmployee(token, employee.uuid, terminationReason, new Date(terminationDate).toISOString());
          break;
          
        case 'reinstate':
          if (!newEmploymentNo.trim()) {
            setSaveError('Please provide a new employment number');
            setSaving(false);
            return;
          }
          await reinstateEmployee(token, employee.uuid, newEmploymentNo);
          break;
          
        default:
          setSaveError('Please select an action');
          setSaving(false);
          return;
      }
      
      setSaveSuccess(true);
      const actionLabel = getActionLabel(selectedAction);
      onShowToast('success', 'Action Successful', `${employee.name} has been ${actionLabel} successfully.`);
      resetActionState();
      onUpdate();
    } catch (error: any) {
      const errorMessage = error.message || 'Action failed';
      setSaveError(errorMessage);
      onShowToast('error', 'Action Failed', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    resetActionState();
  };

  const getFieldValue = (key: string) => {
    if (key in editedFields) return editedFields[key];
    return (employee as any)[key] || '';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: string | number, currency: string = 'KES') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${currency} ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
      {/* Card Header - Always Visible */}
      <div 
        className="p-4 sm:p-5 cursor-pointer bg-gradient-to-r from-slate-50 to-white"
        onClick={() => !selectedAction && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {/* Avatar */}
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-md flex-shrink-0">
              {employee.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            
            {/* Basic Info */}
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{employee.name}</h3>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                <span className="flex items-center gap-1 truncate">
                  <Hash className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{employee.pin}</span>
                </span>
                <span className="flex items-center gap-1 truncate">
                  <Briefcase className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{employee.employment_no}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Status Badge */}
            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
              employee.status === 'active' 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {employee.status}
            </span>

            {/* Expand/Collapse Icon */}
            <div className="text-gray-400">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Gross Pay</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{formatCurrency(employee.gross_pay, employee.currency)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Net Pay</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{formatCurrency(employee.net_pay, employee.currency)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Phone</p>
              <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">{employee.msisdn || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Contract</p>
              <p className="text-xs sm:text-sm font-medium text-gray-700 capitalize truncate">{employee.contract_type}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          {/* Action Selection */}
          <div className="p-3 sm:p-4 bg-white border-b border-gray-100">
            <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Select Action:</p>
            
            {/* Action Type Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Edit */}
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedAction(selectedAction === 'edit' ? null : 'edit'); }}
                className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-lg border-2 transition-all ${
                  selectedAction === 'edit' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Edit3 className="w-5 h-5" />
                <span className="text-xs sm:text-sm font-medium">Edit</span>
              </button>
              
              {/* Deactivate */}
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedAction(selectedAction === 'deactivate' ? null : 'deactivate'); }}
                className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-lg border-2 transition-all ${
                  selectedAction === 'deactivate' 
                    ? 'border-amber-500 bg-amber-50 text-amber-700' 
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <UserMinus className="w-5 h-5" />
                <span className="text-xs sm:text-sm font-medium">Deactivate</span>
              </button>
              
              {/* Terminate */}
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedAction(selectedAction === 'terminate' ? null : 'terminate'); }}
                className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-lg border-2 transition-all ${
                  selectedAction === 'terminate' 
                    ? 'border-red-500 bg-red-50 text-red-700' 
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <UserX className="w-5 h-5" />
                <span className="text-xs sm:text-sm font-medium">Terminate</span>
              </button>
              
              {/* Reinstate */}
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedAction(selectedAction === 'reinstate' ? null : 'reinstate'); }}
                className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-lg border-2 transition-all ${
                  selectedAction === 'reinstate' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span className="text-xs sm:text-sm font-medium">Reinstate</span>
              </button>
            </div>

            {/* Action-specific Forms */}
            {selectedAction && selectedAction !== 'edit' && (
              <div className="mt-4 p-3 sm:p-4 rounded-lg border bg-white">
                {/* Deactivate Form */}
                {selectedAction === 'deactivate' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reason for Deactivation <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={deactivationReason}
                      onChange={(e) => setDeactivationReason(e.target.value)}
                      placeholder="e.g., Going on break, Leave of absence..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-none"
                      rows={2}
                    />
                  </div>
                )}

                {/* Terminate Form */}
                {selectedAction === 'terminate' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Reason for Termination <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={terminationReason}
                        onChange={(e) => setTerminationReason(e.target.value)}
                        placeholder="e.g., End of contract, Resignation..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Termination Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={terminationDate}
                        onChange={(e) => setTerminationDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Reinstate Form */}
                {selectedAction === 'reinstate' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      New Employment Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newEmploymentNo}
                        onChange={(e) => setNewEmploymentNo(e.target.value)}
                        placeholder="e.g., EMP12345"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setNewEmploymentNo(generateEmploymentNo())}
                        className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Generate new number"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Click refresh to generate a new random number</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {selectedAction && (
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium w-full sm:w-auto order-2 sm:order-1"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 w-full sm:w-auto order-1 sm:order-2 ${
                    selectedAction === 'edit' ? 'bg-indigo-600 hover:bg-indigo-700' :
                    selectedAction === 'deactivate' ? 'bg-amber-600 hover:bg-amber-700' :
                    selectedAction === 'terminate' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {selectedAction === 'edit' ? 'Save Changes' :
                   selectedAction === 'deactivate' ? 'Deactivate Employee' :
                   selectedAction === 'terminate' ? 'Terminate Employee' :
                   'Reinstate Employee'}
                </button>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {saveError && (
            <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start sm:items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
              <span className="text-sm">{saveError}</span>
            </div>
          )}
          {saveSuccess && (
            <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Action completed successfully!</span>
            </div>
          )}

          <div className="p-3 sm:p-5 space-y-5 sm:space-y-6">
            {/* Personal Information */}
            <section>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Personal Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                <InfoField label="Full Name" value={employee.name} />
                <InfoField label="KRA PIN" value={employee.pin} />
                <InfoField label="Date of Birth" value={formatDate(employee.dob)} />
                <InfoField label="Gender" value={employee.gender || 'N/A'} />
                {selectedAction === 'edit' ? (
                  <>
                    <EditableField
                      label="Phone Number"
                      value={getFieldValue('msisdn')}
                      type="text"
                      onChange={(v) => handleFieldChange('msisdn', v)}
                    />
                    <EditableField
                      label="Email"
                      value={getFieldValue('email')}
                      type="email"
                      onChange={(v) => handleFieldChange('email', v)}
                    />
                  </>
                ) : (
                  <>
                    <InfoField label="Phone Number" value={employee.msisdn || 'N/A'} icon={<Phone className="w-3 h-3" />} />
                    <InfoField label="Email" value={employee.email || 'N/A'} icon={<Mail className="w-3 h-3" />} />
                  </>
                )}
              </div>
            </section>

            {/* Employment Information */}
            <section>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Employment Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                <InfoField label="Employment Number" value={employee.employment_no} />
                <InfoField label="Date of Employment" value={formatDate(employee.date_of_employment)} icon={<Calendar className="w-3 h-3" />} />
                {selectedAction === 'edit' ? (
                  <>
                    <EditableField
                      label="Contract Type"
                      value={getFieldValue('contract_type')}
                      type="select"
                      options={['permanent', 'fixed-term', 'contract', 'part-time']}
                      onChange={(v) => handleFieldChange('contract_type', v)}
                    />
                    <EditableField
                      label="Contract End Date"
                      value={getFieldValue('date_of_completion')?.split('T')[0] || ''}
                      type="date"
                      onChange={(v) => handleFieldChange('date_of_completion', v)}
                    />
                    <EditableField
                      label="Department"
                      value={getFieldValue('department')}
                      type="text"
                      onChange={(v) => handleFieldChange('department', v)}
                    />
                    <EditableField
                      label="Profession"
                      value={getFieldValue('profession')}
                      type="text"
                      onChange={(v) => handleFieldChange('profession', v)}
                    />
                  </>
                ) : (
                  <>
                    <InfoField label="Contract Type" value={employee.contract_type} />
                    <InfoField label="Contract End Date" value={formatDate(employee.date_of_completion)} />
                    <InfoField label="Department" value={employee.department || 'N/A'} />
                    <InfoField label="Profession" value={employee.profession || 'N/A'} />
                  </>
                )}
                <InfoField label="Employer Type" value={employee.employer_type} />
              </div>
            </section>

            {/* Salary & Deductions */}
            <section>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Salary & Deductions
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                {selectedAction === 'edit' ? (
                  <EditableField
                    label="Basic Salary"
                    value={getFieldValue('salary')}
                    type="number"
                    onChange={(v) => handleFieldChange('salary', v)}
                  />
                ) : (
                  <InfoField label="Basic Salary" value={formatCurrency(employee.salary, employee.currency)} />
                )}
                <InfoField label="Gross Pay" value={formatCurrency(employee.gross_pay, employee.currency)} />
                <InfoField label="Net Pay" value={formatCurrency(employee.net_pay, employee.currency)} highlight="emerald" />
                <InfoField label="Taxable Pay" value={formatCurrency(employee.taxable_pay, employee.currency)} />
                <InfoField label="Tax Due" value={formatCurrency(employee.tax_due, employee.currency)} highlight="red" />
                <InfoField label="Total Deductions" value={formatCurrency(employee.deduction, employee.currency)} />
                <InfoField label="Allowances" value={formatCurrency(employee.allowance, employee.currency)} />
                <InfoField label="Benefits" value={formatCurrency(employee.benefit, employee.currency)} />
                <InfoField label="Relief" value={formatCurrency(employee.relief, employee.currency)} />
              </div>
            </section>

            {/* Statutory Information */}
            <section>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Statutory Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                {selectedAction === 'edit' ? (
                  <>
                    <EditableField
                      label="NSSF Number"
                      value={getFieldValue('nssf_no')}
                      type="text"
                      onChange={(v) => handleFieldChange('nssf_no', v)}
                    />
                    <EditableField
                      label="SHIF Number"
                      value={getFieldValue('shif_no')}
                      type="text"
                      onChange={(v) => handleFieldChange('shif_no', v)}
                    />
                  </>
                ) : (
                  <>
                    <InfoField label="NSSF Number" value={employee.nssf_no} />
                    <InfoField label="SHIF Number" value={employee.shif_no} />
                  </>
                )}
              </div>
            </section>

            {/* Pay Items Breakdown */}
            {employee.items && employee.items.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Pay Items Breakdown
                </h4>
                <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[400px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 text-left font-medium text-gray-700">Type</th>
                        <th className="px-3 sm:px-4 py-2 text-left font-medium text-gray-700">Subtype</th>
                        <th className="px-3 sm:px-4 py-2 text-right font-medium text-gray-700">Amount</th>
                        <th className="px-3 sm:px-4 py-2 text-center font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employee.items
                        .filter(item => parseFloat(item.amount) > 0)
                        .map((item, idx) => (
                          <tr key={item.id || idx} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-3 sm:px-4 py-2 capitalize text-gray-700">{item.type}</td>
                            <td className="px-3 sm:px-4 py-2 text-gray-600">{item.subtype?.replace(/-/g, ' ')}</td>
                            <td className="px-3 sm:px-4 py-2 text-right font-medium">{formatCurrency(item.amount, item.currency)}</td>
                            <td className="px-3 sm:px-4 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Employer Information */}
            {employee.employer_tax_payer && (
              <section>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Employer Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                  <InfoField label="Employer Name" value={employee.employer_tax_payer.name} />
                  <InfoField label="Employer PIN" value={employee.employer_tax_payer.pin} />
                  <InfoField label="Employer Email" value={employee.employer_tax_payer.email || 'N/A'} />
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Info Field Component
const InfoField = ({ 
  label, 
  value, 
  icon, 
  highlight 
}: { 
  label: string; 
  value: string | number; 
  icon?: React.ReactNode;
  highlight?: 'emerald' | 'red' | 'blue';
}) => {
  const highlightClasses = {
    emerald: 'text-emerald-600 font-semibold',
    red: 'text-red-600 font-semibold',
    blue: 'text-blue-600 font-semibold'
  };

  return (
    <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-100">
      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1 flex items-center gap-1 truncate">
        {icon}
        {label}
      </p>
      <p className={`text-xs sm:text-sm truncate ${highlight ? highlightClasses[highlight] : 'text-gray-800'}`}>
        {value}
      </p>
    </div>
  );
};

// Editable Field Component
const EditableField = ({ 
  label, 
  value, 
  type, 
  options,
  onChange 
}: { 
  label: string; 
  value: string; 
  type: 'text' | 'email' | 'number' | 'select' | 'date';
  options?: string[];
  onChange: (value: string) => void;
}) => {
  return (
    <div className="bg-white p-2 sm:p-3 rounded-lg border-2 border-indigo-200">
      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">{label}</p>
      {type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs sm:text-sm border border-gray-300 rounded px-2 py-1.5 sm:py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select...</option>
          {options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs sm:text-sm border border-gray-300 rounded px-2 py-1.5 sm:py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}
    </div>
  );
};

// Main Page Content Component (uses useSearchParams)
function PayrollPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchEmployeesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);
  
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleSearch = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!token) {
      setError('Authorization token is missing from URL');
      return;
    }

    if (!searchQuery.trim()) {
      setError('Please enter a name or KRA PIN to search');
      return;
    }

    const setLoadingState = page === 1 ? setLoading : setLoadingMore;
    setLoadingState(true);
    setError(null);

    try {
      const data = await searchEmployees(token, searchQuery.trim(), page, 5);
      
      if (append && results) {
        setResults({
          ...data,
          entries: [...results.entries, ...data.entries]
        });
      } else {
        setResults(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search employees');
    } finally {
      setLoadingState(false);
    }
  }, [token, searchQuery, results]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleLoadMore = () => {
    if (results && results.page_number < results.total_pages) {
      handleSearch(results.page_number + 1, true);
    }
  };

  const refreshResults = () => {
    handleSearch(1, false);
  };

  // Show error if token is missing
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center border border-red-100">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Authorization Required</h2>
          <p className="text-gray-600 mb-4">
            A valid authorization token is required to access payroll data.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-500 mb-2">Expected URL format:</p>
            <code className="text-xs text-indigo-600 break-all">
              /payroll?token=YOUR_AUTH_TOKEN
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-[#CC0000] shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#CC0000] flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-[#CC0000]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Payroll Management</h1>
              <p className="text-xs sm:text-sm text-white/70 hidden sm:block">Search and manage employee payroll details</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-8 border-t-4 border-[#CC0000]">
          <h2 className="text-base sm:text-lg font-semibold text-[#CC0000] mb-3 sm:mb-4">Search Employees</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Name or KRA PIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent text-gray-800 placeholder-gray-400 text-sm sm:text-base"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-6 py-3 bg-[#CC0000] text-white rounded-lg hover:bg-[#990000] transition-all duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline">Searching...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 hidden sm:block">
            Tip: You can search by employee name or KRA PIN number
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex items-start sm:items-center gap-2 sm:gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="space-y-3 sm:space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between px-1">
              <p className="text-xs sm:text-sm text-gray-600">
                Showing <span className="font-semibold">{results.entries.length}</span> of{' '}
                <span className="font-semibold">{results.total_entries}</span>
              </p>
              <p className="text-xs text-gray-500">
                {results.page_number}/{results.total_pages}
              </p>
            </div>

            {/* Employee Cards */}
            {results.entries.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {results.entries.map((employee) => (
                  <EmployeeCard 
                    key={employee.id} 
                    employee={employee}
                    token={token}
                    onUpdate={refreshResults}
                    onShowToast={showToast}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-100">
                <User className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-600">No employees found</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Try adjusting your search query</p>
              </div>
            )}

            {/* Load More Button */}
            {results.page_number < results.total_pages && (
              <div className="flex justify-center pt-2 sm:pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-white border-2 border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="hidden sm:inline">Loading more...</span>
                      <span className="sm:hidden">Loading...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-5 h-5" />
                      <span className="hidden sm:inline">Load More ({results.total_entries - results.entries.length} remaining)</span>
                      <span className="sm:hidden">Load More ({results.total_entries - results.entries.length})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!results && !loading && (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-16 text-center border border-gray-100">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Search for Employees</h3>
            <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">
              Enter an employee name or KRA PIN above to search.
            </p>
          </div>
        )}
      </main>

      {/* Toast Notifications Container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 space-y-2">
          {toasts.map((toast) => (
            <ToastNotification
              key={toast.id}
              toast={toast}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main Page Component with Suspense wrapper
export default function PayrollPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-gray-600 font-medium">Loading...</span>
        </div>
      </div>
    }>
      <PayrollPageContent />
    </Suspense>
  );
}

