'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CalendarDays, AlertCircle } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';

export function TotFilingMode() {
  const router = useRouter();
  const taxpayerInfo = taxpayerStore.getTaxpayerInfo();
  const [filingMode, setFilingMode] = useState<'daily' | 'monthly' | ''>('');

  if (!taxpayerInfo.idNumber) {
    router.push('/nil-mri-tot/tot/validation');
    return null;
  }

  const handleContinue = () => {
    if (filingMode) {
      taxpayerStore.setFilingMode(filingMode);
      if (filingMode === 'daily') {
        router.push('/nil-mri-tot/tot/daily');
      } else {
        router.push('/nil-mri-tot/tot/monthly');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <button
          onClick={() => router.push('/nil-mri-tot/tot/obligation')}
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="mb-6">
          <h1 className="text-orange-900 mb-2">Turnover Tax (TOT)</h1>
          <p className="text-gray-600">Step 3: Filing Mode</p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-gray-900 mb-6">Choose your filing mode</h2>

          <div className="space-y-4 mb-8">
            <label
              className={`flex items-start gap-4 p-6 border-2 rounded-lg transition-colors cursor-pointer ${
                filingMode === 'daily'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-300 hover:border-orange-300'
              }`}
            >
              <input
                type="radio"
                name="filingMode"
                value="daily"
                checked={filingMode === 'daily'}
                onChange={(e) => setFilingMode(e.target.value as 'daily')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <span className="text-gray-900">Daily</span>
                </div>
                <p className="text-gray-600">File and pay your turnover tax daily</p>
              </div>
            </label>

            {filingMode === 'daily' && (
              <div className="ml-12 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-blue-800">Daily filing requires immediate payment (Pay Now only)</p>
              </div>
            )}

            <label
              className={`flex items-start gap-4 p-6 border-2 rounded-lg transition-colors cursor-pointer ${
                filingMode === 'monthly'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-300 hover:border-orange-300'
              }`}
            >
              <input
                type="radio"
                name="filingMode"
                value="monthly"
                checked={filingMode === 'monthly'}
                onChange={(e) => setFilingMode(e.target.value as 'monthly')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CalendarDays className="w-5 h-5 text-orange-600" />
                  <span className="text-gray-900">Monthly</span>
                </div>
                <p className="text-gray-600">File your turnover tax on a monthly basis</p>
              </div>
            </label>
          </div>

          <button
            onClick={handleContinue}
            disabled={!filingMode}
            className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
