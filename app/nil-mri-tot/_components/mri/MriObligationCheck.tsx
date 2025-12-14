'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';

export function MriObligationCheck() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    if (!info.idNumber) {
      router.push('/nil-mri-tot/mri/validation');
    }
  }, [router]);

  if (!mounted || !taxpayerInfo?.idNumber) {
    return null;
  }

  // For now, assume all validated users have MRI obligation
  // TODO: Call getTaxpayerObligations API when available
  const hasMRIObligation = true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Link
          href="/nil-mri-tot/mri/validation"
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>

        <div className="mb-6">
          <h1 className="text-purple-900 text-2xl font-bold mb-2">MRI Returns</h1>
          <p className="text-gray-600">Step 2: MRI Obligation Check</p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          {!hasMRIObligation ? (
            <>
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-amber-600" />
              </div>

              <h2 className="text-center text-gray-900 text-xl font-semibold mb-4">No MRI Obligation</h2>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-8">
                <p className="text-amber-900">
                  ⚠️ You do not have an MRI obligation.
                </p>
                <p className="text-amber-800 mt-2">
                  If you earn rental income, please register for MRI before filing.
                </p>
              </div>

              <button
                onClick={() => {
                  taxpayerStore.clear();
                  router.push('/nil-mri-tot');
                }}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Return Home
              </button>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-gray-900 text-xl font-semibold mb-2">MRI Obligation Confirmed</h2>
                <p className="text-gray-600">You are registered for MRI. You may proceed to file your return.</p>
              </div>

              <button
                onClick={() => router.push('/nil-mri-tot/mri/rental-income')}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Proceed
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
