'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { Loader2 } from 'lucide-react';
import { lookupById, checkSession, getStoredPhone } from '@/app/actions/nil-mri-tot';
import { IDInput } from '@/app/_components/KRAInputs';
import { YearOfBirthInput } from '@/app/_components/YearOfBirthInput';

function NilValidationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const phone = searchParams.get('phone') || '';
  
  const [yob, setYob] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [isIdValid, setIsIdValid] = useState(false);
  const [isYobValid, setIsYobValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');

  // Check session on mount
  useEffect(() => {
    const performSessionCheck = async () => {
      try {
        const hasSession = await checkSession();
        if (!hasSession) {
          // Redirect to OTP with phone if available
          const redirectUrl = `/nil-mri-tot/otp?redirect=${encodeURIComponent(pathname)}`;
          // Try to get phone from multiple sources
          let phoneToUse = phone;
          if (!phoneToUse) {
            try {
              phoneToUse = localStorage.getItem('phone_Number') || '';
            } catch (e) {
              console.error('Error accessing local storage', e);
            }
          }
          if (phoneToUse) {
             router.push(`${redirectUrl}&number=${encodeURIComponent(phoneToUse)}`);
          } else {
             router.push(redirectUrl);
          }
        } else {
          // Session exists, check for phone
          if (!phone) {
            // Priority 1: Check server-side cookie
            const storedPhone = await getStoredPhone();
            
            if (storedPhone) {
               const redirectUrl = `${pathname}?phone=${encodeURIComponent(storedPhone)}`;
               router.replace(redirectUrl);
            } else {
               // Priority 2: Check client-side local storage
               try {
                 const localPhone = localStorage.getItem('phone_Number');
                 if (localPhone) {
                    const redirectUrl = `${pathname}?phone=${encodeURIComponent(localPhone)}`;
                    router.replace(redirectUrl);
                    return;
                 }
               } catch (e) {
                 console.error('Error accessing local storage', e);
               }
               
               // No phone found anywhere, redirect to OTP (without number param)
               router.push(`/nil-mri-tot/otp?redirect=${encodeURIComponent(pathname)}`);
            }
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
  }, [pathname, phone, router]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    );
  }

  const handleValidate = async () => {
    setError('');
    setLoading(true);
    
    try {
      if (!phone) {
        throw new Error('Phone number is missing');
      }
      const result = await lookupById(idNumber, phone, yob);
      
      if (result.success) {
        const taxpayer = {
          fullName: result.name || 'Unknown',
          pin: result.pin || idNumber,
          yob: parseInt(yob),
        };
        taxpayerStore.setTaxpayerInfo(idNumber, parseInt(yob), taxpayer.fullName, taxpayer.pin);
        const nextUrl = `/nil-mri-tot/nil/verify${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`;
        router.push(nextUrl);
      } else {
        setError(result.error|| 'Invalid taxpayer credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Validate Taxpayer">
      <div className="space-y-4">
        {/* Header Card */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">NIL Returns</h1>
          <p className="text-gray-400 text-xs">Step 1/3 - Validation</p>
        </div>

        <Card>
          <div className="space-y-4">
            <IDInput
              label="ID Number"
              value={idNumber}
              onChange={setIdNumber}
              onValidationChange={setIsIdValid}
              required
            />
            
            <YearOfBirthInput 
              label="Year of Birth"
              value={yob}
              onChange={setYob}
              onValidationChange={setIsYobValid}
              required
            />
          </div>
        </Card>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <Button 
          onClick={handleValidate} 
          disabled={!isIdValid || !isYobValid || loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Validating...</>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </Layout>
  );
}

export default function NilValidationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <NilValidationContent />
    </Suspense>
  );
}
