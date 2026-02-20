'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { Loader2 } from 'lucide-react';
import { lookupById, getStoredPhone } from '@/app/actions/nil-mri-tot';
import { IDInput } from '@/app/_components/KRAInputs';
import { YearOfBirthInput } from '@/app/_components/YearOfBirthInput';
import { analytics } from '@/app/_lib/analytics';
import { getKnownPhone, saveKnownPhone } from '@/app/_lib/session-store';

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
      console.log('=== NIL VALIDATION PHONE CHECK START ===');
      
      try {
        // First, try to get phone from various sources if not in URL
        let currentPhone = phone;
        
        if (!currentPhone) {
          // Try localStorage first (using shared store)
          try {
            const localPhone = getKnownPhone();
            if (localPhone) {
              currentPhone = localPhone;
            }
          } catch (e) {
            console.error('Error accessing localStorage', e);
          }
        }
        
        if (!currentPhone) {
          // Try server-side cookie (for convenience, not auth)
          const storedPhone = await getStoredPhone();
          if (storedPhone) {
            currentPhone = storedPhone;
          }
        }
        
        // If we found a phone, update URL if needed and persist it
        if (currentPhone) {
          if (currentPhone !== phone) {
             router.replace(`${pathname}?phone=${encodeURIComponent(currentPhone)}`);
          }
          saveKnownPhone(currentPhone);
        }
        
        setCheckingSession(false);
      } catch (err) {
        console.error('Phone check failed', err);
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
          pin: result.pin || 'Unknown',
          yob: parseInt(yob),
        };
        taxpayerStore.setTaxpayerInfo(idNumber, parseInt(yob), taxpayer.fullName, taxpayer.pin);
        if (phone) analytics.setUserId(phone);
        analytics.track('nil_validation_success', { obligation_type: 'nil' }, { journey_start: true });
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
    <Layout title="Validate Taxpayer" onBack={() => router.push('/nil-mri-tot')} showMenu>
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
