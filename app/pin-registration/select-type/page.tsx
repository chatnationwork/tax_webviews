'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Layout } from '../../_components/Layout';
import { Globe, Flag, Loader2 } from 'lucide-react';
import { getStoredPhone } from '@/app/actions/pin-registration';

function SelectResidencyTypeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlPhone = searchParams.get('phone') || '';
  
  const [phone, setPhone] = useState(urlPhone);
  const [checkingSession, setCheckingSession] = useState(true);

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
        
        setCheckingSession(false);
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

  return (
    <Layout title="Select Registration Type" onBack={() => router.back()} showMenu>
      <div className="space-y-4">
        <button
          onClick={() => router.push(`/pin-registration/kenyan/identity?phone=${encodeURIComponent(phone)}`)}
          className="w-full bg-white border-2 border-gray-300 rounded-xl p-6 hover:border-green-600 hover:bg-green-50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Flag className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-gray-900 font-semibold mb-1">Kenyan Resident</h3>
              <p className="text-sm text-gray-600">
                Register using your National ID
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push(`/pin-registration/non-kenyan/identity?phone=${encodeURIComponent(phone)}`)}
          className="w-full bg-white border-2 border-gray-300 rounded-xl p-6 hover:border-green-600 hover:bg-green-50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-gray-900 font-semibold mb-1">Non-Kenyan Resident</h3>
              <p className="text-sm text-gray-600">
                Register using your Alien ID
              </p>
            </div>
          </div>
        </button>
      </div>
    </Layout>
  );
}

export default function SelectResidencyType() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <SelectResidencyTypeContent />
    </Suspense>
  );
}
