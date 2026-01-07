'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { lookupById, checkSession, getStoredPhone } from '@/app/actions/nil-mri-tot';
import { taxpayerStore } from '../../_lib/store';
import { Layout, Card, Button, Input } from '../../../_components/Layout';
import { IDInput } from '@/app/_components/KRAInputs';

function MriValidationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const phone = searchParams.get('phone') || '';
  
  const [yob, setYob] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [isIdValid, setIsIdValid] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

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

  const isYobValid = yob.length === 4 && /^\d{4}$/.test(yob);

  const handleValidate = async () => {
    setError('');
    setLoading(true);
    
    try {
      if (!phone) {
         throw new Error('Phone number is missing. Please re-verify via OTP.');
      }

      // Pass ID number and Year of Birth to the lookup API
      // Using lookupById from nil actions which supports phone
      const result = await lookupById(idNumber, phone, yob);
      
      if (result.success) {
        const taxpayer = {
          fullName: result.name || 'Unknown',
          pin: result.pin || idNumber,  // PIN stores the ID number
          yob: parseInt(yob),
        };
        // Save to store
        taxpayerStore.setTaxpayerInfo(idNumber, parseInt(yob), taxpayer.fullName, taxpayer.pin);
        
        // Direct redirect to rental income, skipping obligation check
        const nextUrl = `/nil-mri-tot/mri/rental-income${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`;
        router.push(nextUrl);
      } else {
        setError(result.error || 'Invalid taxpayer credentials. Please check your details.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate taxpayer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <Layout title="MRI Returns" showHeader={false} showFooter={false}>
         <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
         </div>
      </Layout>
    );
  }

  return (
    <Layout title="MRI Returns" step="Step 1: Validation" showMenu>
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="p-6">
           <h2 className="text-lg font-semibold text-gray-800 mb-4">Validate Taxpayer</h2>
           
           <div className="space-y-4">
             

              <IDInput
                label="ID Number"
                value={idNumber}
                onChange={setIdNumber}
                onValidationChange={setIsIdValid}
                helperText="Enter 6-8 digit National ID"
              />

               <Input 
                label="Year of Birth"
                value={yob}
                onChange={(val) => setYob(val.replace(/\D/g, '').slice(0, 4))}
                placeholder="e.g., 1990"
                type="tel"
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                onClick={handleValidate}
                disabled={!isYobValid || !isIdValid || loading}
                className="w-full mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Validating...</>
                ) : (
                  'Validate & Continue'
                )}
              </Button>
           </div>
        </Card>
      </div>
    </Layout>
  );
}

export default function MriValidationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <MriValidationContent />
    </Suspense>
  );
}
