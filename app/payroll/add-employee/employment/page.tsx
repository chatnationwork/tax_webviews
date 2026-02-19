'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Briefcase, AlertCircle, Shield } from 'lucide-react';
import { Layout, Card, Button, Input, Select } from '../../../_components/Layout';
import {payrollStore } from '../../../_lib/payroll-store';
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

  const [formData, setFormData] = useState({
    employerTaxPayerId: '',
    employerKraPin: '',
    employmentType: 'permanent',
    startDate: '',
    basicSalary: '',
    hasBenefits: 'no'
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

    // Save to store
    payrollStore.setEmployeeData({
      employerTaxPayerId: formData.employerTaxPayerId,
      employerKraPin: formData.employerKraPin,
      employmentType: formData.employmentType,
      startDate: formData.startDate,
      basicSalary: Number(formData.basicSalary),
      hasBenefits: formData.hasBenefits === 'yes'
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
              label="Employer TaxPayer ID"
              value={formData.employerTaxPayerId}
              onChange={(value) => handleChange('employerTaxPayerId', value)}
              placeholder="e.g., 21128"
              required
            />

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
