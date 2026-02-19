'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, User, AlertCircle, Shield } from 'lucide-react';
import { Layout, Card, Button, Input, Select } from '../../../_components/Layout';
import {payrollStore } from '../../../_lib/payroll-store';
import { getStoredPhoneServer } from '@/app/actions/auth';
import { getKnownPhone, saveKnownPhone } from '@/app/_lib/session-store';

function PersonalInfoContent() {
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
    nationality: 'citizen' as 'citizen' | 'resident' | 'non-resident',
    idNumber: '',
    kraPin: '',
    firstName: ''
  });
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleContinue = () => {
    // Validation
    if (!formData.idNumber.trim()) {
      setError('ID/Passport number is required');
      return;
    }
    if (!formData.kraPin.trim()) {
      setError('KRA PIN is required');
      return;
    }
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return;
    }

    // Save to store
    payrollStore.setEmployeeData({
      nationality: formData.nationality,
      idNumber: formData.idNumber,
      kraPin: formData.kraPin,
      firstName: formData.firstName
    });

    // Navigate to employment details
    const params = new URLSearchParams();
    if (phone) params.set('phone', phone);
    router.push(`/payroll/add-employee/employment?${params.toString()}`);
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



  return (
    <Layout 
      title="Add New Employee" 
      step="Step 1 of 3: Personal Information"
      onBack={() => router.push(buildBackUrl())}
    >
      <div className="space-y-4">
        {/* Header Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Personal Information</h2>
              <p className="text-xs text-gray-500">Enter the employee's personal details</p>
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card>
          <div className="space-y-4">
            <Select
              label="Nationality"
              value={formData.nationality}
              onChange={(value) => handleChange('nationality', value)}
              options={[
                { value: 'citizen', label: 'Kenyan Citizen' },
                { value: 'resident', label: 'Resident' },
                { value: 'non-resident', label: 'Non-Resident' }
              ]}
              required
            />

            <Input
              label="ID / Passport Number"
              value={formData.idNumber}
              onChange={(value) => handleChange('idNumber', value)}
              placeholder="e.g., 12345678"
              required
            />

            <Input
              label="KRA PIN"
              value={formData.kraPin}
              onChange={(value) => handleChange('kraPin', value.toUpperCase())}
              placeholder="e.g., A001234567Z"
              required
            />

            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(value) => handleChange('firstName', value)}
              placeholder="e.g., John"
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
          Continue to Employment Details
        </Button>
      </div>
    </Layout>
  );
}

export default function PersonalInfoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    }>
      <PersonalInfoContent />
    </Suspense>
  );
}
