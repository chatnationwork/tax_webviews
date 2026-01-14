'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Button, DeclarationCheckbox, Input } from '../../../_components/Layout';
import { getRegistrationData, getPhoneNumber } from '../../_lib/store';
import { submitPinRegistration } from '../../../actions/pin-registration';
import { Loader2 } from 'lucide-react';

export default function KenyanDeclaration() {
  const router = useRouter();
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    const regData = getRegistrationData();
    if (!regData || regData.type !== 'kenyan') {
      router.push('/pin-registration/kenyan/identity');
      return;
    }
    setData(regData);
  }, [router]);

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!isAgreed || !data) return;
    
    if (!validateEmail(email)) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const phoneNumber = getPhoneNumber() || '254712345678';
      
      const result = await submitPinRegistration(
        'citizen',
        data.nationalId,
        email,
        phoneNumber
      );

      if (result.success) {
        // Store result for success page
        sessionStorage.setItem('pin_registration_result', JSON.stringify(result));
        router.push('/pin-registration/kenyan/success');
      } else {
        setError(result.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!data) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout title="Declaration" onBack={() => router.back()} showMenu>
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            You are about to submit your PIN registration. Please ensure all information provided is accurate.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          error={emailError}
          required
          disabled={isSubmitting}
        />

        <DeclarationCheckbox
          label="I confirm that the information provided is true and correct, and I understand that providing false information may result in legal consequences."
          legalNote="By submitting this registration, you agree to the Kenya Revenue Authority's terms and conditions. Your data will be processed in accordance with the Data Protection Act, 2019."
          checked={isAgreed}
          onChange={e => setIsAgreed(e.target.checked)}
          disabled={isSubmitting}
        />

        <div className="pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={!isAgreed || isSubmitting || !email}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit Registration'
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
