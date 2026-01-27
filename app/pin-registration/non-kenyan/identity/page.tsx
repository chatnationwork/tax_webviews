'use client';

// Non-Kenyan (Alien) identity verification page for PIN registration
// Validates Alien ID, first name, and year of birth before proceeding

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Button, Input } from '../../../_components/Layout';
import { getPhoneNumber, saveRegistrationData, savePhoneNumber } from '../../_lib/store';
import { lookupById } from '../../../actions/pin-registration';
import { Loader2 } from 'lucide-react';
import { IDInput } from '@/app/_components/KRAInputs';
import { YearOfBirthInput } from '@/app/_components/YearOfBirthInput';

/**
 * Inner content component that uses useSearchParams
 * Must be wrapped in Suspense for Next.js SSR compatibility
 */
function NonKenyanIdentityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPhone = searchParams.get('phone') || '';
  
  const [formData, setFormData] = useState({
    alienId: '',
    yearOfBirth: '',
    firstName: '',
  });
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

    if (!formData.alienId || formData.alienId.length < 6) {
      newErrors.alienId = 'Please enter a valid Alien ID number';
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
      // For non-Kenyan, we attempt lookup but allow continuation even if not found
      const result = await lookupById(formData.alienId,phoneNumber, formData.yearOfBirth, formData.firstName,"alien");
      
      // Save registration data
      saveRegistrationData({
        ...formData,
        type: 'non-kenyan',
      });
      
      
      // Store validated data if available
      if (result.success && typeof window !== 'undefined') {
        sessionStorage.setItem('pin_validated_data', JSON.stringify({
          idNumber: formData.alienId,
          name: result.name || formData.firstName,
          pin: result.pin,
          firstName: formData.firstName,
          yob: result.yob,
        }));
        router.push('/pin-registration/non-kenyan/validate');
      } else {
        setApiError(result.error || 'Validation failed. Please check your details.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      setApiError(error.message || 'An error occurred during validation');
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
          label="Alien ID Number"
         
          placeholder="Enter your Alien ID"
          value={formData.alienId}
          onChange={value => {
            setFormData({ ...formData, alienId: value });
            setApiError('');
          }}
          error={errors.alienId}
          disabled={isLoading}
        />

        <YearOfBirthInput
          label="Year of Birth"
          value={formData.yearOfBirth}
          onChange={value => setFormData({ ...formData, yearOfBirth: value })}
          error={errors.yearOfBirth}
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
export default function NonKenyanIdentityInput() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <NonKenyanIdentityContent />
    </Suspense>
  );
}
