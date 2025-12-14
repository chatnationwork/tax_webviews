'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calculator, AlertCircle, Loader2 } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';
import { fileTotReturn } from '../../../actions/tax-filing';

export function TotDailyFiling() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [grossSales, setGrossSales] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    if (!info.idNumber || info.filingMode !== 'daily') {
      router.push('/nil-mri-tot/tot/validation');
    }
  }, [router]);

  if (!mounted || !taxpayerInfo?.idNumber || taxpayerInfo?.filingMode !== 'daily') {
    return null;
  }

  const totTax = grossSales ? (parseFloat(grossSales) * 0.03).toFixed(2) : '0.00';

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getReturnPeriod = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handlePayNow = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await fileTotReturn(
        taxpayerInfo.pin,
        getReturnPeriod(),
        parseFloat(grossSales),
        'daily'
      );

      if (result.success) {
        taxpayerStore.setGrossSales(parseFloat(grossSales));
        taxpayerStore.setPaymentType('pay-now');
        (taxpayerStore as any).receiptNumber = result.receiptNumber;
        router.push('/nil-mri-tot/tot/result');
      } else {
        setError(result.message || 'Failed to file TOT return');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while filing the return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Link
          href="/nil-mri-tot/tot/filing-mode"
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>

        <div className="mb-6">
          <h1 className="text-orange-900 text-2xl font-bold mb-2">Turnover Tax (TOT)</h1>
          <p className="text-gray-600">Step 4: Daily Filing</p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-800">Daily filing requires immediate payment. You must pay now to complete this filing.</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="grossSales" className="text-gray-700 font-medium">
                Gross Sales
              </label>
              <span className="text-orange-600 text-sm">Date: {getCurrentDate()}</span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                KES
              </span>
              <input
                type="number"
                id="grossSales"
                value={grossSales}
                onChange={(e) => setGrossSales(e.target.value)}
                placeholder="0.00"
                className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Calculator className="w-6 h-6 text-orange-600" />
              <h3 className="text-orange-900 font-semibold">Auto Calculation</h3>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">TOT (3%)</span>
              <span className="text-orange-900 font-bold text-lg">
                KES {totTax}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handlePayNow}
            disabled={!grossSales || parseFloat(grossSales) <= 0 || loading}
            className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Pay Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
