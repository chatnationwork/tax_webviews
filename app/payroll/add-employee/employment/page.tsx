'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Briefcase, AlertCircle, Shield } from 'lucide-react';
import { Layout, Card, Button, Input, Select } from '../../../_components/Layout';
import { payrollStore } from '../../../_lib/payroll-store';
import { getStoredPhoneServer } from '@/app/actions/auth';
import { getKnownPhone, saveKnownPhone } from '@/app/_lib/session-store';

function EmploymentDetailsContent() {
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

  const [formData, setFormData] = useState(() => {
    const emp = payrollStore.getEmployeeData();
    const org = payrollStore.getOrganizationContext();
    return {
      organizationId: emp.organizationId || org.organizationId || '',
      employerTaxPayerId: emp.employerTaxPayerId || org.taxPayerId || '',
      employerKraPin: emp.employerKraPin || '',
      employmentType: emp.employmentType || 'permanent',
      startDate: emp.startDate || '',
      basicSalary:
        emp.basicSalary != null && emp.basicSalary > 0 ? String(emp.basicSalary) : '',
      hasBenefits: emp.hasBenefits ? 'yes' : 'no',
      housingAllowance:
        emp.housingAllowance != null && emp.housingAllowance > 0
          ? String(emp.housingAllowance)
          : '',
      transportAllowance:
        emp.transportAllowance != null && emp.transportAllowance > 0
          ? String(emp.transportAllowance)
          : '',
      contractEndDate: emp.dateOfCompletion || ''
    };
  });
  const [error, setError] = useState('');

  // Check if we have personal info from previous step
  useEffect(() => {
    const employeeData = payrollStore.getEmployeeData();
    if (!employeeData.idNumber || !employeeData.kraPin) {
      // Redirect back to personal info
      const params = new URLSearchParams();
      if (phone) params.set('phone', phone);
      router.push(`/payroll/add-employee/personal?${params.toString()}`);
    }
  }, [phone, router]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleContinue = () => {
    // Validation
    if (!formData.employerTaxPayerId.trim()) {
      setError('Employer TaxPayer ID is required');
      return;
    }
    if (!/^\d+$/.test(formData.employerTaxPayerId.trim())) {
      setError(
        'Employer Tax Payer ID must be digits only (e.g. 11690252) — the numeric eTIMS taxpayer ID, not the employer KRA PIN.'
      );
      return;
    }
    if (!formData.employerKraPin.trim()) {
      setError('Employer KRA PIN is required');
      return;
    }
    if (!formData.startDate) {
      setError('Start date is required');
      return;
    }
    if (!formData.basicSalary || isNaN(Number(formData.basicSalary)) || Number(formData.basicSalary) <= 0) {
      setError('Please enter a valid basic salary');
      return;
    }

    const hasBen = formData.hasBenefits === 'yes';
    let housing = 0;
    let transport = 0;
    if (hasBen) {
      housing = Math.max(0, Number(formData.housingAllowance) || 0);
      transport = Math.max(0, Number(formData.transportAllowance) || 0);
      if (
        String(formData.housingAllowance ?? '').trim() !== '' &&
        (isNaN(Number(formData.housingAllowance)) || Number(formData.housingAllowance) < 0)
      ) {
        setError('Enter a valid housing allowance amount or leave blank for 0');
        return;
      }
      if (
        String(formData.transportAllowance ?? '').trim() !== '' &&
        (isNaN(Number(formData.transportAllowance)) || Number(formData.transportAllowance) < 0)
      ) {
        setError('Enter a valid transport allowance amount or leave blank for 0');
        return;
      }
    }

    // Save to store
    payrollStore.setEmployeeData({
      organizationId: formData.organizationId.trim(),
      employerTaxPayerId: formData.employerTaxPayerId.trim(),
      employerKraPin: formData.employerKraPin.trim(),
      employmentType: formData.employmentType,
      startDate: formData.startDate,
      basicSalary: Number(formData.basicSalary),
      hasBenefits: hasBen,
      housingAllowance: hasBen ? housing : undefined,
      transportAllowance: hasBen ? transport : undefined,
      dateOfCompletion: formData.contractEndDate.trim() || undefined
    });
    payrollStore.setOrganizationContext({
      organizationId: formData.organizationId.trim(),
      taxPayerId: formData.employerTaxPayerId.trim()
    });
    payrollStore.setPayrollContext({
      employerTaxPayerId: formData.employerTaxPayerId
    });

    // Navigate to confirmation
    const params = new URLSearchParams();
    if (phone) params.set('phone', phone);
    router.push(`/payroll/add-employee/confirm?${params.toString()}`);
  };

  const buildBackUrl = () => {
    const params = new URLSearchParams();
    if (phone) params.set('phone', phone);
    return `/payroll/add-employee/personal?${params.toString()}`;
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



  return (
    <Layout 
      title="Add New Employee" 
      step="Step 2 of 3: Employment Details"
      onBack={() => router.push(buildBackUrl())}
    >
      <div className="space-y-4">
        {/* Header Card */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Employment Details</h2>
              <p className="text-xs text-gray-500">Enter the employment and salary information</p>
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card>
          <div className="space-y-4">
            <Input
              label="Organisation ID (optional)"
              value={formData.organizationId}
              onChange={(value) => handleChange('organizationId', value)}
              placeholder="Leave blank if not applicable"
            />
            <p className="text-xs text-gray-500 -mt-2">
              Leave blank to send an empty <code className="text-[10px]">organization_id</code> on the API; fill only if
              you have an organisation record ID.
            </p>

            <Input
              label="Employer Tax Payer ID (numeric)"
              value={formData.employerTaxPayerId}
              onChange={(value) => handleChange('employerTaxPayerId', value)}
              placeholder="e.g., 11690252"
              required
            />
            <p className="text-xs text-gray-500 -mt-2">
              Use the numeric organisation taxpayer ID from eTIMS / your payroll portal — not the employer KRA PIN
              (that is the next field).
            </p>

            <Input
              label="Employer KRA PIN"
              value={formData.employerKraPin}
              onChange={(value) => handleChange('employerKraPin', value.toUpperCase())}
              placeholder="e.g., P051234567A"
              required
            />

            <Select
              label="Employment Type"
              value={formData.employmentType}
              onChange={(value) => handleChange('employmentType', value)}
              options={[
                { value: 'permanent', label: 'Permanent' },
                { value: 'contract', label: 'Contract' },
                { value: 'casual', label: 'Casual' },
                { value: 'fixed-term', label: 'Fixed Term' },
                { value: 'internship', label: 'Internship' }
              ]}
              required
            />

            <Input
              label="Start Date"
              value={formData.startDate}
              onChange={(value) => handleChange('startDate', value)}
              type="date"
              required
            />

            <Input
              label="Contract end date (optional)"
              value={formData.contractEndDate}
              onChange={(value) => handleChange('contractEndDate', value)}
              type="date"
            />

            <Input
              label="Basic Salary (KES)"
              value={formData.basicSalary}
              onChange={(value) => handleChange('basicSalary', value)}
              type="number"
              placeholder="e.g., 50000"
              min="0"
              required
            />

            <Select
              label="Employee Has Benefits?"
              value={formData.hasBenefits}
              onChange={(value) => handleChange('hasBenefits', value)}
              options={[
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Yes' }
              ]}
              required
            />

            {formData.hasBenefits === 'yes' && (
              <>
                <Input
                  label="Housing allowance (KES, optional)"
                  value={formData.housingAllowance}
                  onChange={(value) => handleChange('housingAllowance', value)}
                  type="number"
                  placeholder="0"
                  min="0"
                />
                <Input
                  label="Transport allowance (KES, optional)"
                  value={formData.transportAllowance}
                  onChange={(value) => handleChange('transportAllowance', value)}
                  type="number"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500">
                  Sent as housing_allowance and transport_allowance string fields per payroll.json Add Single
                  Employee.
                </p>
              </>
            )}
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Continue Button */}
        <Button onClick={handleContinue}>
          Review & Confirm
        </Button>
      </div>
    </Layout>
  );
}

export default function EmploymentDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    }>
      <EmploymentDetailsContent />
    </Suspense>
  );
}
