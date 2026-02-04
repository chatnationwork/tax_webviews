'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { Layout, Button, Card } from '../_components/Layout';
import { analytics } from '../_lib/analytics';
import { savePhoneNumber, getPhoneNumber } from './_lib/store';
import { getKnownPhone, saveKnownPhone } from '../_lib/session-store';

function PinRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlPhone = searchParams.get('phone') || '';
  
  const [phone, setPhone] = useState(urlPhone);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let currentPhone = urlPhone;
    
    if (!currentPhone) {
      try {
        const localPhone = getKnownPhone() || getPhoneNumber();
        if (localPhone) {
          currentPhone = localPhone;
        }
      } catch (e) {}
    }
    
    if (currentPhone) {
      setPhone(currentPhone);
      savePhoneNumber(currentPhone);
      try {
        saveKnownPhone(currentPhone);
      } catch (e) {}
      
      if (currentPhone !== urlPhone) {
        router.replace(`${pathname}?phone=${encodeURIComponent(currentPhone)}`);
        return;
      }
      
      // Identify the user
      analytics.identify(currentPhone);
    }
    
    setIsReady(true);
  }, [urlPhone, pathname, router]);

  const handleStart = () => {
    if (phone) {
      router.push(`/pin-registration/select-type?phone=${encodeURIComponent(phone)}`);
    } else {
      router.push(`/otp?redirect=${encodeURIComponent(pathname)}`);
    }
  };

  if (!isReady) {
    return null;
  }

  return (
    <Layout title="PIN Registration" onBack={() => router.push('/')}>
      <div className="space-y-4">
        {/* Logo */}
        <div className="flex justify-center">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-14 w-auto" />
        </div>

        {/* Main Card */}
        <Card className="bg-blue-50 border-blue-200 !p-6">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 rounded-full bg-blue-100 mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">KRA PIN Registration</h2>
            <p className="text-sm text-gray-600 mb-6">
              Register for a KRA PIN in 2–3 minutes.
            </p>

            {!phone && (
              <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="text-xs text-amber-800">
                  Cannot proceed without phone number
                </p>
              </div>
            )}
            
            <Button onClick={handleStart} className="w-full">
              Start Registration
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default function PinRegistrationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>}>
      <PinRegistrationContent />
    </Suspense>
  );
}
