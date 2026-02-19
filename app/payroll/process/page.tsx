'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Calculator, CheckCircle, AlertCircle, Calendar, Shield } from 'lucide-react';
import { Layout, Card, Button, Input } from '../../_components/Layout';
import { processRegularPayroll } from '../../actions/payroll';
import { getStoredPhoneServer } from '@/app/actions/auth';
import { getKnownPhone, saveKnownPhone } from '@/app/_lib/session-store';

const CONTRACT_TYPES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'fixed-term', label: 'Fixed Term' },
  { value: 'casual', label: 'Casual' }
];

function ProcessPayrollContent() {
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

  // Redirect to OTP if no token (only after session check)
  useEffect(() => {
    if (!checkingSession && phone) {
      // Logic without token redirect
    }
  }, [phone, router, checkingSession]);

  const [formData, setFormData] = useState({
    period: '',
    employerTaxPayerId: '',
    contractTypes: ['permanent'] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [refNo, setRefNo] = useState('');
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleContractTypeToggle = (value: string) => {
    setFormData(prev => {
      const types = prev.contractTypes.includes(value)
        ? prev.contractTypes.filter(t => t !== value)
        : [...prev.contractTypes, value];
      return { ...prev, contractTypes: types };
    });
    setError('');
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.period) {
      setError('Please select a period');
      return;
    }
    if (!formData.employerTaxPayerId.trim()) {
      setError('Employer TaxPayer ID is required');
      return;
    }
    if (formData.contractTypes.length === 0) {
      setError('Please select at least one contract type');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await processRegularPayroll(
        formData.period,
        formData.employerTaxPayerId,
        formData.contractTypes
      );

      if (result.success) {
        setRefNo(result.refNo || '');
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to process payroll');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payroll');
    } finally {
      setLoading(false);
    }
  };

  const buildBackUrl = () => {
    const params = new URLSearchParams();
    if (phone) params.set('phone', phone);
    return `/payroll?${params.toString()}`;
  };

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
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Phone Number Required</h2>
          <p className="text-sm text-gray-600">Please access this page via WhatsApp.</p>
        </div>
      </div>
    );
  }



  if (success) {
    return (
      <Layout 
        title="Payroll Processed" 
        showHeader={false}
        showFooter={false}
      >
        <div className="min-h-[80vh] flex flex-col items-center justify-center py-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
            Payroll Processed!
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Your payroll has been processed successfully.
          </p>

          {refNo && (
            <Card className="w-full max-w-sm bg-green-50 border-green-200 mb-6">
              <div className="text-center">
                <p className="text-xs text-green-600 mb-1">Reference Number</p>
                <p className="text-lg font-bold text-green-800">{refNo}</p>
              </div>
            </Card>
          )}

          <div className="w-full max-w-sm space-y-3">
            <Button onClick={() => router.push(buildBackUrl())}>
              Back to Payroll Services
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Process Regular Payroll" 
      step="Enter payroll details"
      onBack={() => router.push(buildBackUrl())}
    >
      <div className="space-y-4">
        {/* Header Card */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Calculator className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Process Payroll</h2>
              <p className="text-xs text-gray-500">Run regular payroll for a specific period</p>
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1 font-medium">
                Period <span className="text-[var(--kra-red)]">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="month"
                  value={formData.period}
                  onChange={(e) => handleChange('period', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--kra-red)] focus:border-transparent"
                />
              </div>
            </div>

            <Input
              label="Employer TaxPayer ID"
              value={formData.employerTaxPayerId}
              onChange={(value) => handleChange('employerTaxPayerId', value)}
              placeholder="e.g., 21128"
              required
            />

            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">
                Contract Types to Process <span className="text-[var(--kra-red)]">*</span>
              </label>
              <div className="space-y-2">
                {CONTRACT_TYPES.map((type) => (
                  <label 
                    key={type.value}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.contractTypes.includes(type.value)}
                      onChange={() => handleContractTypeToggle(type.value)}
                      className="w-4 h-4 rounded border-gray-300 text-[var(--kra-red)] focus:ring-[var(--kra-red)]"
                    />
                    <span className="text-sm text-gray-700">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Processing...
            </>
          ) : (
            'Process Payroll'
          )}
        </Button>

        {/* Info Note */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> This will process payroll for all employees matching the selected contract types.
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default function ProcessPayrollPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    }>
      <ProcessPayrollContent />
    </Suspense>
  );
}
