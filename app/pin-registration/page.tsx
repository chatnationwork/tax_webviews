'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Button } from '../_components/Layout';
import { savePhoneNumber } from './_lib/store';
import { FileText } from 'lucide-react';

function PinRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('phone');

  useEffect(() => {
    // Save phone number from URL to session and local storage
    if (phoneNumber) {
      savePhoneNumber(phoneNumber);
    }
  }, [phoneNumber]);

  const handleStart = () => {
    // If we already have the phone number, skip OTP and go directly to type selection
    if (phoneNumber) {
      router.push('/pin-registration/select-type');
    } else {
      router.push('/pin-registration/otp');
    }
  };

  return (
    <Layout title="KRA PIN Registration">
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-20 h-20 bg-kra-light-gray rounded-full flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-kra-red" />
        </div>
        
        <h1 className="text-2xl font-semibold mb-3 text-gray-900 text-center">PIN Registration</h1>
        
        <p className="text-gray-600 text-center mb-8 max-w-sm">
          Register for a KRA PIN in 2–3 minutes.
        </p>

        {!phoneNumber && (
          <div className="bg-kra-light-gray border border-kra-border-gray rounded-lg p-3 mb-6 text-center">
            <p className="text-sm text-kra-black">
             Cannot proeceed without phone number
            </p>
          </div>
        )}
        
        <div className="w-full space-y-3">
          <Button onClick={handleStart}>
            Start Registration
          </Button>
          
         
        </div>
      </div>
    </Layout>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading...</div>
    </div>
  );
}

export default function PinRegistrationStart() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PinRegistrationContent />
    </Suspense>
  );
}
