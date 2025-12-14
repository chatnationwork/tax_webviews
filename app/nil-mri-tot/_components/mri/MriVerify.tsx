'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';
import { VerificationCard } from '../VerificationCard';

export function MriVerify() {
  const router = useRouter();
  const taxpayerInfo = taxpayerStore.getTaxpayerInfo();

  if (!taxpayerInfo.idNumber) {
    router.push('/nil-mri-tot/mri/validation');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <button
          onClick={() => router.push('/nil-mri-tot/mri/validation')}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="mb-6">
          <h1 className="text-purple-900 mb-2">MRI Returns</h1>
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
          onClick={() => router.push('/nil-mri-tot/mri/obligation')}
          className="w-full mt-6 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
