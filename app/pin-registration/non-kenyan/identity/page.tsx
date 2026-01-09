'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Button, Input } from '../../../_components/Layout';
import { getPhoneNumber, saveRegistrationData } from '../../_lib/store';
import { lookupById } from '../../../actions/pin-registration';
import { Loader2 } from 'lucide-react';

export default function NonKenyanIdentityInput() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    alienId: '',
    yearOfBirth: '',
    email: '',
  });
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

    if (!formData.alienId || formData.alienId.length < 6) {
      newErrors.alienId = 'Please enter a valid Alien ID number';
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
      // For non-Kenyan, we attempt lookup but allow continuation even if not found
      const result = await lookupById(formData.alienId,phoneNumber, formData.yearOfBirth);
      
      // Save registration data
      saveRegistrationData({
        ...formData,
        type: 'non-kenyan',
      });
      
      // Store validated data if available
      if (result.success && typeof window !== 'undefined') {
        sessionStorage.setItem('pin_validated_data', JSON.stringify({
          idNumber: formData.alienId,
          name: result.name || 'Non-Kenyan Resident',
          pin: result.pin,
          email: formData.email,
        }));
      }
      
      router.push('/pin-registration/non-kenyan/validate');
    } catch (err: any) {
      // Allow continuation even on error for non-Kenyan
      saveRegistrationData({
        ...formData,
        type: 'non-kenyan',
      });
      router.push('/pin-registration/non-kenyan/validate');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title="Verify Your Identity" onBack={() => router.back()}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-xs text-blue-900">
          <strong>Test Data:</strong> Alien ID: A1234567 | Year: 1988 | Email: test@test.com
        </p>
      </div>

      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-600">{apiError}</p>
        </div>
      )}

      <div className="space-y-5">
        <Input
          label="Alien ID Number"
          type="text"
          placeholder="Enter your Alien ID"
          value={formData.alienId}
          onChange={value => {
            setFormData({ ...formData, alienId: value });
            setApiError('');
          }}
          error={errors.alienId}
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
