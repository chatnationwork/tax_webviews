'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Button, Input } from '../../../_components/Layout';
import { IDInput } from '@/app/_components/KRAInputs';
import { getPhoneNumber, saveRegistrationData } from '../../_lib/store';
import { lookupById } from '../../../actions/pin-registration';
import { Loader2 } from 'lucide-react';

export default function KenyanIdentityInput() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nationalId: '',
    yearOfBirth: '',
    email: '',
  });
  const [isIdValid, setIsIdValid] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

    useEffect(() => {
      // Get phone from URL or session
      const storedPhone =  getPhoneNumber() || '';
      setPhoneNumber(storedPhone);
      
    
    }, []);
  

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nationalId || formData.nationalId.length < 6) {
      newErrors.nationalId = 'Please enter a valid National ID number';
    }

    if (!formData.yearOfBirth || formData.yearOfBirth.length !== 4) {
      newErrors.yearOfBirth = 'Please enter a valid year (e.g., 1990)';
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setApiError('');

    try {
      // Lookup ID to validate and get taxpayer details
      const result = await lookupById(formData.nationalId, phoneNumber, formData.yearOfBirth);
      
      if (result.success) {
        // Save registration data with validated info
        saveRegistrationData({
          ...formData,
          type: 'kenyan',
        });
        
        // Store validated data
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pin_validated_data', JSON.stringify({
            idNumber: formData.nationalId,
            name: result.name || 'User',
            pin: result.pin,
            email: formData.email,
          }));
        }
        
        router.push('/pin-registration/kenyan/validate');
      } else {
        setApiError(result.error || 'Invalid ID number. Please check and try again.');
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to validate ID. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title="Verify Your Identity" onBack={() => router.back()}>


      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-600">{apiError}</p>
        </div>
      )}

      <div className="space-y-5">
        <IDInput
          label="National ID Number"
          value={formData.nationalId}
          onChange={value => {
            setFormData({ ...formData, nationalId: value });
            setApiError('');
          }}
          onValidationChange={setIsIdValid}
          error={errors.nationalId}
          helperText="Enter 6-8 digit National ID"
          disabled={isLoading}
        />

        <Input
          label="Year of Birth"
          type="text"
          inputMode="numeric"
          placeholder="YYYY"
          maxLength={4}
          value={formData.yearOfBirth}
          onChange={value => setFormData({ ...formData, yearOfBirth: value })}
          error={errors.yearOfBirth}
          disabled={isLoading}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={value => setFormData({ ...formData, email: value })}
          error={errors.email}
          helperText="We'll send your PIN certificate to this email"
          disabled={isLoading}
        />

        <div className="pt-4">
          <Button onClick={handleContinue} disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Validating...
              </span>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
