'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';
import { OBLIGATION_IDS } from '../../_lib/constants';
import { fileNilReturn } from '../../../actions/tax-filing';

// NIL obligation types
const NIL_OBLIGATIONS = [
  { id: 'vat', label: 'VAT NIL', obligationId: OBLIGATION_IDS.VAT },
  { id: 'itr', label: 'ITR NIL', obligationId: OBLIGATION_IDS.ITR },
  { id: 'paye', label: 'PAYE NIL', obligationId: OBLIGATION_IDS.PAYE },
  { id: 'mri', label: 'MRI NIL', obligationId: OBLIGATION_IDS.MRI },
];

export function NilSelect() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string>('');
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const getCurrentPeriod = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const firstDay = `01/${String(month + 1).padStart(2, '0')}/${year}`;
    const lastDay = `${new Date(year, month + 1, 0).getDate()}/${String(month + 1).padStart(2, '0')}/${year}`;
    return `${firstDay} - ${lastDay}`;
  };

  const handleFileReturn = async () => {
    if (!selectedType) return;
    
    setLoading(true);
    setError('');
    
    try {
      const obligation = NIL_OBLIGATIONS.find(o => o.id === selectedType);
      if (!obligation) {
        setError('Invalid obligation type selected');
        return;
      }

      const result = await fileNilReturn(
        taxpayerInfo.pin,
        obligation.obligationId,
        getCurrentPeriod()
      );

      if (result.success) {
        taxpayerStore.setSelectedNilType(selectedType);
        // Store the receipt number for the result page
        (taxpayerStore as any).receiptNumber = result.receiptNumber;
        router.push('/nil-mri-tot/nil/result');
      } else {
        setError(result.message || 'Failed to file NIL return');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while filing the return');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-blue-900 text-2xl font-bold mb-2">NIL Returns</h1>
          <p className="text-gray-600">Step 2: Select NIL Obligation</p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-gray-900 font-semibold mb-6">Choose the NIL return you want to file</h2>

          <div className="space-y-4 mb-8">
            {NIL_OBLIGATIONS.map((obligation) => (
              <div key={obligation.id}>
                <label
                  className={`flex items-start gap-4 p-4 border-2 rounded-lg transition-colors cursor-pointer ${
                    selectedType === obligation.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="nilType"
                    value={obligation.id}
                    checked={selectedType === obligation.id}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">
                      {obligation.label}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Period: {getCurrentPeriod()}
                    </p>
                  </div>
                </label>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleFileReturn}
            disabled={!selectedType || loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Filing Return...
              </>
            ) : (
              'File NIL Return'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
