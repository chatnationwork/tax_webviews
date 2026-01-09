'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, Home as HomeIcon, Calculator, Phone, AlertCircle } from 'lucide-react';
import { taxpayerStore } from '../nil-mri-tot/_lib/store';


function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading Tax Filing Portal...</div>
    </div>
  );
}

function NilMriTotContent() {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }


  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-blue-900 text-3xl font-bold mb-2">Kenya Revenue Authority</h1>
          <p className="text-gray-600">Tax Filing Portal</p>
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
            <span className="text-yellow-800">No phone number provided. Add ?msisdn=254XXXXXXXXX to the URL for WhatsApp notifications.</span>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* NIL Returns */}
          <Link
            href={`/nil-mri-tot/nil/validation${msisdn ? `?phone=${encodeURIComponent(msisdn)}` : ''}`}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-blue-100 hover:border-blue-400 group"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
              <FileText className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-blue-900 text-xl font-bold mb-3">NIL Returns</h2>
            <p className="text-gray-600">File NIL returns for VAT, ITR, PAYE, or MRI obligations</p>
          </Link>

          {/* MRI Returns */}
          <Link
            href={`/nil-mri-tot/mri/validation${msisdn ? `?phone=${encodeURIComponent(msisdn)}` : ''}`}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-purple-100 hover:border-purple-400 group"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-purple-500 transition-colors">
              <HomeIcon className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-purple-900 text-xl font-bold mb-3">MRI Returns</h2>
            <p className="text-gray-600">File Monthly Rental Income returns and calculate tax</p>
          </Link>

          {/* TOT Returns */}
          <Link
            href={`/nil-mri-tot/tot/validation${msisdn ? `?phone=${encodeURIComponent(msisdn)}` : ''}`}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-orange-100 hover:border-orange-400 group"
          >
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors">
              <Calculator className="w-8 h-8 text-orange-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-orange-900 text-xl font-bold mb-3">Turnover Tax</h2>
            <p className="text-gray-600">File daily or monthly turnover tax returns</p>
          </Link>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500">Filing Year: <span className="text-gray-700 font-medium">{new Date().getFullYear()}</span></p>
        </div>
      </div>
    </div>
  );
}

export default function NilMriTotPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NilMriTotContent />
    </Suspense>
  );
}
