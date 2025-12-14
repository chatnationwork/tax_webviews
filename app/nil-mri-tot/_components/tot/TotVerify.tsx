'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';
import { VerificationCard } from '../VerificationCard';

export function TotVerify() {
  const router = useRouter();
  const taxpayerInfo = taxpayerStore.getTaxpayerInfo();

  if (!taxpayerInfo.idNumber) {
    router.push('/nil-mri-tot/tot/validation');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <button
          onClick={() => router.push('/nil-mri-tot/tot/validation')}
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="mb-6">
          <h1 className="text-orange-900 mb-2">Turnover Tax (TOT)</h1>
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
          onClick={() => router.push('/nil-mri-tot/tot/obligation')}
          className="w-full mt-6 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
