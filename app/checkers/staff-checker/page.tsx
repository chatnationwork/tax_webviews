'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Layout, Card, Button } from '../../_components/Layout';
import { Loader2, UserCheck } from 'lucide-react';
import { checkSession, getStoredPhone, initSession, checkStaff } from '@/app/actions/checkers';
import { IDInput } from '@/app/_components/KRAInputs';

function StaffCheckerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlPhone = searchParams.get('phone') || '';
  
  const [phone, setPhone] = useState(urlPhone);
  const [nationalId, setNationalId] = useState('');
  const [isIdValid, setIsIdValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const performSessionCheck = async () => {
      try {
        let currentPhone = urlPhone;
        
        if (!currentPhone) {
          try {
            const localPhone = localStorage.getItem('phone_Number');
            if (localPhone) currentPhone = localPhone;
          } catch (e) {
            console.error('Error accessing localStorage', e);
          }
        }
        
        if (!currentPhone) {
          const storedPhone = await getStoredPhone();
          if (storedPhone) currentPhone = storedPhone;
        }
        
        if (currentPhone && currentPhone !== urlPhone) {
          setPhone(currentPhone);
          router.replace(`${pathname}?phone=${encodeURIComponent(currentPhone)}`);
        } else if (currentPhone) {
          setPhone(currentPhone);
        }
        
        const hasSession = await checkSession();
        if (!hasSession) {
          let redirectUrl = `/checkers/otp?redirect=${encodeURIComponent(pathname)}`;
          if (currentPhone) redirectUrl += `&number=${encodeURIComponent(currentPhone)}`;
          router.push(redirectUrl);
        } else {
          if (!currentPhone) {
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
      if (!phone) throw new Error('Phone number is missing');
      
      await initSession(phone);
      const result = await checkStaff(nationalId);
      
      if (result.success && result.data) {
        sessionStorage.setItem('staffCheckerResult', JSON.stringify(result.data));
        router.push(`/checkers/staff-checker/result?phone=${encodeURIComponent(phone)}`);
      } else {
        setError(result.error || 'Staff validation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Check failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Staff Checker" onBack={() => router.push('/')}>
      <div className="space-y-4">
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Staff Checker</h1>
              <p className="text-gray-400 text-xs">Verify KRA staff by National ID</p>
            </div>
          </div>
        </div>

        <Card>
          <div className="space-y-4">
            <IDInput
              label="National ID Number"
              value={nationalId}
              onChange={setNationalId}
              onValidationChange={setIsIdValid}
              required
            />
            <p className="text-xs text-gray-500">
              Enter the staff member's National ID (6-8 digits)
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
          disabled={!isIdValid || loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Checking...</>
          ) : (
            'Check Staff'
          )}
        </Button>
      </div>
    </Layout>
  );
}

export default function StaffCheckerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <StaffCheckerContent />
    </Suspense>
  );
}
