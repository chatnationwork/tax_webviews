'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';
import { VerificationCard } from '../VerificationCard';
import { useEffect, useState } from 'react';

export function NilVerify() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    if (!info.idNumber) {
      router.push('/nil-mri-tot/nil/validation');
    }
  }, [router]);

  if (!mounted || !taxpayerInfo?.idNumber) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Link
          href="/nil-mri-tot/nil/validation"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>

        <div className="mb-6">
          <h1 className="text-blue-600 text-2xl font-bold mb-2">NIL Returns</h1>
          <p className="text-gray-600">Step 2: Verify Taxpayer</p>
        </div>

        <VerificationCard
          fullName={taxpayerInfo.fullName}
          idNumber={taxpayerInfo.idNumber}
          pin={taxpayerInfo.pin}
          yob={taxpayerInfo.yob}
          filingYear={taxpayerInfo.filingYear}
        />

        <button
          onClick={() => router.push('/nil-mri-tot/nil/select')}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
