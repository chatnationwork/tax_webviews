'use client';

// Kenyan identity verification page for PIN registration
// Validates National ID, first name, and year of birth before proceeding

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Button, Input } from '../../../_components/Layout';
import { IDInput } from '@/app/_components/KRAInputs';
import { getPhoneNumber, saveRegistrationData, savePhoneNumber } from '../../_lib/store';
import { lookupById } from '../../../actions/pin-registration';
import { Loader2 } from 'lucide-react';
import { YearOfBirthInput } from '@/app/_components/YearOfBirthInput';
import { analytics } from '@/app/_lib/analytics';

/**
 * Inner content component that uses useSearchParams
 * Must be wrapped in Suspense for Next.js SSR compatibility
 */
function KenyanIdentityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPhone = searchParams.get('phone') || '';
  
  const [formData, setFormData] = useState({
    nationalId: '',
    yearOfBirth: '',
    firstName: '',
  });
  const [isIdValid, setIsIdValid] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    // First check URL params, then fall back to stored phone
    if (urlPhone) {
      setPhoneNumber(urlPhone);
      savePhoneNumber(urlPhone); // Persist for future use
    } else {
      const storedPhone = getPhoneNumber() || '';
      setPhoneNumber(storedPhone);
    }
  }, [urlPhone]);
  

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nationalId || formData.nationalId.length < 6) {
      newErrors.nationalId = 'Please enter a valid National ID number';
    }

    if (!formData.yearOfBirth || formData.yearOfBirth.length !== 4) {
      newErrors.yearOfBirth = 'Please enter a valid year (e.g., 1990)';
    }

    if (!formData.firstName || formData.firstName.trim().length < 2) {
      newErrors.firstName = 'Please enter your first name';
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
      const result = await lookupById(formData.nationalId, phoneNumber, formData.yearOfBirth,formData.firstName);
      
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
            name: result.name || formData.firstName,
            pin: result.pin,
            firstName: formData.firstName,
          }));
        }
        
        if (phoneNumber) analytics.setUserId(phoneNumber);
        analytics.track('kenyan_pin_registration_started', { id_type: 'national_id' }, { journey_start: true });
        router.push('/pin-registration/kenyan/validate');
      } else {
        setApiError(result.error || 'Invalid ID number. Please check and try again.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setApiError(error.message || 'Failed to validate ID. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title="Verify Your Identity" onBack={() => router.back()} showMenu>


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
          disabled={isLoading}
        />

        <Input
          label="First Name"
          type="text"
          placeholder="Enter your first name"
          value={formData.firstName}
          onChange={value => setFormData({ ...formData, firstName: value })}
          error={errors.firstName}
          disabled={isLoading}
          required
        />

        <YearOfBirthInput
          label="Year of Birth"
          value={formData.yearOfBirth}
          onChange={value => setFormData({ ...formData, yearOfBirth: value })}
          error={errors.yearOfBirth}
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

/**
 * Main export wrapped in Suspense for useSearchParams compatibility
 */
export default function KenyanIdentityInput() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <KenyanIdentityContent />
    </Suspense>
  );
}
