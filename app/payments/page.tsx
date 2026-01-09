'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, Briefcase, Receipt, Phone, AlertCircle } from 'lucide-react';
import { taxpayerStore } from './_lib/store';


function Home() {
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
          <p className="text-gray-600">Payment Services Portal</p>
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
          {/* AHL Payments */}
          <Link
            href={msisdn ? `/payments/ahl/payment?phone=${encodeURIComponent(msisdn)}` : '/payments/ahl/payment'}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-teal-100 hover:border-teal-400 group"
          >
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-500 transition-colors">
              <Building2 className="w-8 h-8 text-teal-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-teal-900 text-xl font-bold mb-3">AHL Payments</h2>
            <p className="text-gray-600">Pay Advance Housing Levy contributions</p>
          </Link>

          {/* NITA Payments */}
          <Link
            href={msisdn ? `/payments/nita/payment?phone=${encodeURIComponent(msisdn)}` : '/payments/nita/payment'}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-purple-100 hover:border-purple-400 group"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-purple-500 transition-colors">
              <Briefcase className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-purple-900 text-xl font-bold mb-3">NITA Payments</h2>
            <p className="text-gray-600">Pay National Industrial Training Authority levy</p>
          </Link>

          {/* E-SLIP Payments */}
          <Link
            href={msisdn ? `/payments/eslip/payment?phone=${encodeURIComponent(msisdn)}` : '/payments/eslip/payment'}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-orange-100 hover:border-orange-400 group"
          >
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors">
              <Receipt className="w-8 h-8 text-orange-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-orange-900 text-xl font-bold mb-3">E-SLIP</h2>
            <p className="text-gray-600">Pay using existing PRN number</p>
          </Link>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500">Payment Year: <span className="text-gray-700 font-medium">{new Date().getFullYear()}</span></p>
        </div>
      </div>
    </div>
  );
}


function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading Payment Services...</div>
    </div>
  );
}

export default function PaymentServicesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Home />
    </Suspense>
  );
}
