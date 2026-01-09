'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Layout, Card, Button } from '../../_components/Layout';
import { Loader2, Search } from 'lucide-react';
import { checkSession, getStoredPhone, initSession, checkPin } from '@/app/actions/checkers';
import { PINInput } from '@/app/_components/KRAInputs';

function PinCheckerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlPhone = searchParams.get('phone') || '';
  
  const [phone, setPhone] = useState(urlPhone);
  const [pinNumber, setPinNumber] = useState('');
  const [isPinValid, setIsPinValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');

  // Check session on mount
  useEffect(() => {
    const performSessionCheck = async () => {
      try {
        // First, try to get phone from various sources if not in URL
        let currentPhone = urlPhone;
        
        if (!currentPhone) {
          // Try localStorage first
          try {
            const localPhone = localStorage.getItem('phone_Number');
            if (localPhone) {
              currentPhone = localPhone;
            }
          } catch (e) {
            console.error('Error accessing localStorage', e);
          }
        }
        
        if (!currentPhone) {
          // Try server-side cookie
          const storedPhone = await getStoredPhone();
          if (storedPhone) {
            currentPhone = storedPhone;
          }
        }
        
        // If we found a phone, update state and URL
        if (currentPhone && currentPhone !== urlPhone) {
          setPhone(currentPhone);
          router.replace(`${pathname}?phone=${encodeURIComponent(currentPhone)}`);
        } else if (currentPhone) {
          setPhone(currentPhone);
        }
        
        // Now check session
        const hasSession = await checkSession();
        if (!hasSession) {
          // Redirect to OTP with phone if available
          let redirectUrl = `/checkers/otp?redirect=${encodeURIComponent(pathname)}`;
          if (currentPhone) {
            redirectUrl += `&number=${encodeURIComponent(currentPhone)}`;
          }
          router.push(redirectUrl);
        } else {
          if (!currentPhone) {
            // No phone anywhere, must go to OTP
            router.push(`/checkers/otp?redirect=${encodeURIComponent(pathname)}`);
          } else {
            setCheckingSession(false);
          }
        }
      } catch (err) {
        console.error('Session check failed', err);
        setCheckingSession(false);
      }
    };
    
    performSessionCheck();
  }, [pathname, urlPhone, router]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    );
  }

  const handleCheck = async () => {
    setError('');
    setLoading(true);
    
    try {
      if (!phone) {
        throw new Error('Phone number is missing');
      }
      
      // Initialize session first
      await initSession(phone);
      
      // Then check PIN
      const result = await checkPin(pinNumber);
      
      if (result.success && result.data) {
        // Store result and navigate to result page
        sessionStorage.setItem('pinCheckerResult', JSON.stringify(result.data));
        router.push(`/checkers/pin-checker/result?phone=${encodeURIComponent(phone)}`);
      } else {
        setError(result.error || 'PIN validation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Check failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="PIN Checker" onBack={() => router.push('/')}>
      <div className="space-y-4">
        {/* Header Card */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Search className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold">PIN Checker</h1>
              <p className="text-gray-400 text-xs">Verify KRA PIN validity</p>
            </div>
          </div>
        </div>

        <Card>
          <div className="space-y-4">
            <PINInput
              label="KRA PIN Number"
              value={pinNumber}
              onChange={setPinNumber}
              onValidationChange={setIsPinValid}
              required
            />
            <p className="text-xs text-gray-500">
              Enter an 11-character KRA PIN to verify (e.g., A012345678Z)
            </p>
          </div>
        </Card>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <Button 
          onClick={handleCheck} 
          disabled={!isPinValid || loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Checking...</>
          ) : (
            'Check PIN'
          )}
        </Button>
      </div>
    </Layout>
  );
}

export default function PinCheckerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <PinCheckerContent />
    </Suspense>
  );
}
