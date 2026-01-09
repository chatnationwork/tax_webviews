'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileCheck, Phone, AlertCircle } from 'lucide-react';
import { taxpayerStore } from './_lib/store';

export function Home() {
  const searchParams = useSearchParams();
  const [msisdn, setMsisdn] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Extract msisdn from URL query parameter
    const phoneNumber = searchParams.get('msisdn') || searchParams.get('phone') || '';
    if (phoneNumber) {
      taxpayerStore.setMsisdn(phoneNumber);
      setMsisdn(phoneNumber);
    } else {
      // Check if already stored
      const storedMsisdn = taxpayerStore.getMsisdn();
      if (storedMsisdn) {
        setMsisdn(storedMsisdn);
      }
    }
    setMounted(true);
  }, [searchParams]);

  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return '';
    // Format as 254 XXX XXX XXX
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 12) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }
    return phone;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-teal-900 text-3xl font-bold mb-2">Kenya Revenue Authority</h1>
          <p className="text-gray-600">Tax Compliance Certificate Portal</p>
        </div>

        {/* Phone Number Display */}
        {msisdn && (
          <div className="mb-8 p-4 bg-white rounded-xl shadow-md flex items-center justify-center gap-3">
            <Phone className="w-5 h-5 text-green-600" />
            <span className="text-gray-600">WhatsApp Session:</span>
            <span className="text-gray-900 font-medium">{formatPhoneDisplay(msisdn)}</span>
          </div>
        )}

        {!msisdn && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800 text-sm">No phone number provided.</span>
          </div>
        )}

        {/* TCC Application Card */}
        <Link
          href={msisdn ? `/tcc/validation?phone=${encodeURIComponent(msisdn)}` : '/tcc/validation'}
          className="block bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-teal-100 hover:border-teal-400 group"
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:bg-teal-500 transition-colors">
              <FileCheck className="w-10 h-10 text-teal-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-teal-900 text-xl font-bold mb-3">TCC Application</h2>
            <p className="text-gray-600 text-sm">
              Apply for a Tax Compliance Certificate for job applications, government tenders, work permits, and more.
            </p>
            <div className="mt-4 inline-block px-6 py-2 bg-teal-500 text-white rounded-lg font-medium group-hover:bg-teal-600 transition-colors">
              Apply Now
            </div>
          </div>
        </Link>

        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">Powered by KRA iTax Services</p>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading TCC Portal...</div>
    </div>
  );
}

export default function TccApplicationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Home />
    </Suspense>
  );
}
