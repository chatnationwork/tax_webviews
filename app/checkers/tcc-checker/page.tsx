'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Layout, Card, Button, Input } from '../../_components/Layout';
import { Loader2, Shield } from 'lucide-react';
import { checkSession, getStoredPhone, initSession, checkTcc } from '@/app/actions/checkers';
import { PINInput } from '@/app/_components/KRAInputs';
import { getKnownPhone, saveKnownPhone } from '@/app/_lib/session-store';
import { analytics } from '@/app/_lib/analytics';

function TccCheckerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlPhone = searchParams.get('phone') || '';
  
  const [phone, setPhone] = useState(urlPhone);
  const [kraPin, setKraPin] = useState('');
  const [tccNumber, setTccNumber] = useState('');
  const [isPinValid, setIsPinValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');

  // Load phone on mount (no session check required)
  useEffect(() => {
    const loadPhone = async () => {
      try {
        let currentPhone = urlPhone;
        
        if (!currentPhone) {
          try {
            const localPhone = getKnownPhone();
            if (localPhone) currentPhone = localPhone;
          } catch (e) {}
        }
        
        if (!currentPhone) {
          const storedPhone = await getStoredPhone();
          if (storedPhone) currentPhone = storedPhone;
        }
        
        if (currentPhone) {
          setPhone(currentPhone);
          if (currentPhone !== urlPhone) {
            router.replace(`${pathname}?phone=${encodeURIComponent(currentPhone)}`);
          }
          saveKnownPhone(currentPhone);
        }
      } finally {
        setCheckingSession(false);
      }
    };
    
    loadPhone();
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
      if (!phone) throw new Error('Phone number is missing');
      if (!tccNumber.trim()) throw new Error('TCC Number is required');
      
      await initSession(phone);
      const result = await checkTcc(kraPin, tccNumber.trim());
      
      if (result.success && result.data) {
        sessionStorage.setItem('tccCheckerResult', JSON.stringify(result.data));
        if (phone) analytics.setUserId(phone);
        analytics.track('tcc_checker_started', { pin: kraPin, tcc_number: tccNumber.trim() }, { journey_start: true });
        router.push(`/checkers/tcc-checker/result?phone=${encodeURIComponent(phone)}`);
      } else {
        setError(result.error || 'TCC validation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Check failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="TCC Checker" onBack={() => router.push('/')} showMenu>
      <div className="space-y-4">
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold">TCC Checker</h1>
              <p className="text-gray-400 text-xs">Verify Tax Compliance Certificate</p>
            </div>
          </div>
        </div>

        <Card>
          <div className="space-y-4">
            <PINInput
              label="KRA PIN"
              value={kraPin}
              onChange={setKraPin}
              onValidationChange={setIsPinValid}
              required
            />
            
            <Input
              label="TCC Number"
              value={tccNumber}
              onChange={setTccNumber}
              placeholder="Enter TCC Number"
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
          onClick={handleCheck} 
          disabled={!isPinValid || !tccNumber.trim() || loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Checking...</>
          ) : (
            'Check TCC'
          )}
        </Button>
      </div>
    </Layout>
  );
}

export default function TccCheckerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <TccCheckerContent />
    </Suspense>
  );
}
