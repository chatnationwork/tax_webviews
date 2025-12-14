'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calculator, Loader2 } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';
import { fileMriReturn } from '../../../actions/tax-filing';

export function MriRentalIncome() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [rentalIncome, setRentalIncome] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const mriTax = rentalIncome ? (parseFloat(rentalIncome) * 0.1).toFixed(2) : '0.00';

  const getCurrentPeriod = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthName = now.toLocaleString('default', { month: 'long' });
    return `${monthName} ${year}`;
  };

  const getReturnPeriod = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const firstDay = `01/${String(month + 1).padStart(2, '0')}/${year}`;
    const lastDay = `${new Date(year, month + 1, 0).getDate()}/${String(month + 1).padStart(2, '0')}/${year}`;
    return `${firstDay} - ${lastDay}`;
  };

  const handleFileReturn = async (withPayment: boolean) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await fileMriReturn(
        taxpayerInfo.pin,
        getReturnPeriod(),
        parseFloat(rentalIncome)
      );

      if (result.success) {
        taxpayerStore.setRentalIncome(parseFloat(rentalIncome));
        taxpayerStore.setPaymentType(withPayment ? 'file-and-pay' : 'file-only');
        (taxpayerStore as any).receiptNumber = result.receiptNumber;
        router.push('/nil-mri-tot/mri/result');
      } else {
        setError(result.message || 'Failed to file MRI return');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while filing the return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Link
          href="/nil-mri-tot/mri/obligation"
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>

        <div className="mb-6">
          <h1 className="text-purple-900 text-2xl font-bold mb-2">MRI Returns</h1>
          <p className="text-gray-600">Step 3: Rental Income</p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="rentalIncome" className="text-gray-700 font-medium">
                Rental Income
              </label>
              <span className="text-purple-600 text-sm">Period: {getCurrentPeriod()}</span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                KES
              </span>
              <input
                type="number"
                id="rentalIncome"
                value={rentalIncome}
                onChange={(e) => setRentalIncome(e.target.value)}
                placeholder="0.00"
                className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Calculator className="w-6 h-6 text-purple-600" />
              <h3 className="text-purple-900 font-semibold">Auto Calculation</h3>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">MRI Tax (10%)</span>
              <span className="text-purple-900 font-bold text-lg">
                KES {mriTax}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => handleFileReturn(false)}
              disabled={!rentalIncome || parseFloat(rentalIncome) <= 0 || loading}
              className="w-full border-2 border-purple-600 text-purple-600 py-3 rounded-lg hover:bg-purple-50 transition-colors disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              File Only
            </button>
            <button
              onClick={() => handleFileReturn(true)}
              disabled={!rentalIncome || parseFloat(rentalIncome) <= 0 || loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              File & Pay Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
