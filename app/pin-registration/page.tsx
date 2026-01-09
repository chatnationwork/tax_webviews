'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Layout, Button } from '../_components/Layout';
import { savePhoneNumber, getPhoneNumber } from './_lib/store';
import { FileText } from 'lucide-react';

function PinRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlPhone = searchParams.get('phone') || '';
  
  const [phone, setPhone] = useState(urlPhone);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Try to get phone from various sources if not in URL
    let currentPhone = urlPhone;
    
    if (!currentPhone) {
      // Try localStorage
      try {
        const localPhone = localStorage.getItem('phone_Number') || getPhoneNumber();
        if (localPhone) {
          currentPhone = localPhone;
        }
      } catch (e) {
        console.error('Error accessing localStorage', e);
      }
    }
    
    // If we found a phone, update state and URL if needed
    if (currentPhone) {
      setPhone(currentPhone);
      savePhoneNumber(currentPhone);
      
      if (currentPhone !== urlPhone) {
        router.replace(`${pathname}?phone=${encodeURIComponent(currentPhone)}`);
        return;
      }
    }
    
    setIsReady(true);
  }, [urlPhone, pathname, router]);

  const handleStart = () => {
    // If we have the phone number, go directly to type selection
    if (phone) {
      router.push(`/pin-registration/select-type?phone=${encodeURIComponent(phone)}`);
    } else {
      // No phone - redirect to OTP with redirect back here
      router.push(`/otp?redirect=${encodeURIComponent(pathname)}`);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

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

        {!phone && (
          <div className="bg-kra-light-gray border border-kra-border-gray rounded-lg p-3 mb-6 text-center">
            <p className="text-sm text-kra-black">
             Cannot proceed without phone number
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
