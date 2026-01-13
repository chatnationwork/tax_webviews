'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { IDInput } from '@/app/_components/KRAInputs';
import { YearOfBirthInput } from '@/app/_components/YearOfBirthInput';
import { lookupById, checkSession, getStoredPhone } from '@/app/actions/nil-mri-tot';
import { taxpayerStore } from '../../_lib/store';
import { Loader2 } from 'lucide-react';

function TotValidationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const phone = searchParams.get('phone') || '';

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  
  const [idNumber, setIdNumber] = useState('');
  const [yob, setYob] = useState('');

  // Check session on mount
  useEffect(() => {
    const performSessionCheck = async () => {
      try {
        // First, try to get phone from various sources if not in URL
        let currentPhone = phone;
        
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
        
        // If we found a phone, update URL if needed
        if (currentPhone && currentPhone !== phone) {
          router.replace(`${pathname}?phone=${encodeURIComponent(currentPhone)}`);
          return; // Let the effect re-run with new URL
        }
        
        // Now check session
        const hasSession = await checkSession();
        if (!hasSession) {
          // Redirect to OTP with phone if available
          let redirectUrl = `/otp?redirect=${encodeURIComponent(pathname)}`;
          if (currentPhone) {
            redirectUrl += `&phone=${encodeURIComponent(currentPhone)}`;
          }
          router.push(redirectUrl);
        } else {
          if (!currentPhone) {
            // No phone anywhere, must go to OTP
            router.push(`/otp?redirect=${encodeURIComponent(pathname)}`);
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

  const handleValidation = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (!phone) {
        throw new Error('Phone number is missing. Please re-verify via OTP.');
      }

      const result = await lookupById(idNumber, phone, yob);
      
      if (result.success) {
        taxpayerStore.setTaxpayerInfo(
        idNumber || 'Unknown',
          parseInt(yob),
          result.name || 'Unknown',
          result.pin || 'Unknown'
        );
        
        const nextUrl = `/nil-mri-tot/tot/verify${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`;
        router.push(nextUrl);
      } else {
        setError(result.error || 'Validation failed. Please check your details.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during validation');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    );
  }

  return (
    <Layout title="TOT Return" onBack={() => router.push('/nil-mri-tot')} showMenu>
      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white shadow-lg">
          <h1 className="text-lg font-bold mb-1">Turnover Tax (TOT)</h1>
          <p className="text-gray-300 text-xs">Step 1/3 - Validation</p>
        </div>

        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2">
            Taxpayer Validation
          </h2>
          
          <div className="space-y-4">
            <IDInput 
              value={idNumber}
              onChange={setIdNumber}
              label="National ID Number"
              placeholder="Enter ID Number"
            />
            
            <YearOfBirthInput 
            label='Year of Birth'
              value={yob}
              onChange={setYob}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <Button 
            onClick={handleValidation}
            disabled={!idNumber || !yob || loading}
            className="w-full mt-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Validating...</>
            ) : (
              'Continue'
            )}
          </Button>
        </Card>
      </div>
    </Layout>
  );
}

export default function TotValidationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <TotValidationContent />
    </Suspense>
  );
}
