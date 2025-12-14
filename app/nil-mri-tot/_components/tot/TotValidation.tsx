'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calculator, ArrowLeft, Loader2 } from 'lucide-react';
import { lookupTaxpayerById } from '../../../actions/tax-filing';
import { taxpayerStore } from '../../_lib/store';

export function TotValidation() {
  const router = useRouter();
  const [yob, setYob] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [validated, setValidated] = useState(false);
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    setError('');
    setLoading(true);
    
    try {
      // Pass ID number and Year of Birth to the buyer_lookup API
      const result = await lookupTaxpayerById(idNumber, parseInt(yob));
      
      if (result.success) {
        const taxpayer = {
          fullName: result.name || 'Unknown',
          pin: result.pin || idNumber,  // PIN stores the ID number
          yob: parseInt(yob),
        };
        setTaxpayerInfo(taxpayer);
        setValidated(true);
        taxpayerStore.setTaxpayerInfo(idNumber, parseInt(yob), taxpayer.fullName, taxpayer.pin);
      } else {
        setError(result.message || 'Invalid taxpayer credentials. Please check your ID Number and Year of Birth.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate taxpayer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/nil-mri-tot/tot/obligation');
  };

  const getCurrentFilingYear = () => new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Link
          href="/nil-mri-tot"
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Calculator className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-orange-900 text-2xl font-bold">Turnover Tax</h1>
              <p className="text-gray-600">Step 1: Taxpayer Validation</p>
            </div>
          </div>

          {!validated ? (
            <>
              <div className="space-y-6 mb-8">
                <div>
                  <label htmlFor="yob" className="block text-gray-700 mb-2 font-medium">
                    Year of Birth
                  </label>
                  <input
                    type="number"
                    id="yob"
                    value={yob}
                    onChange={(e) => setYob(e.target.value)}
                    placeholder="e.g., 1990"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label htmlFor="idNumber" className="block text-gray-700 mb-2 font-medium">
                    ID Number
                  </label>
                  <input
                    type="text"
                    id="idNumber"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Enter ID Number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                  </div>
                )}
              </div>

              <button
                onClick={handleValidate}
                disabled={!yob || !idNumber || loading}
                className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate Taxpayer'
                )}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-4 mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-green-900 font-semibold">Taxpayer Verified</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-600 block mb-1 text-sm">Year of Birth</label>
                    <p className="text-gray-900 font-medium">{yob}</p>
                  </div>
                  <div>
                    <label className="text-gray-600 block mb-1 text-sm">ID Number</label>
                    <p className="text-gray-900 font-medium">{idNumber}</p>
                  </div>
                  <div>
                    <label className="text-gray-600 block mb-1 text-sm">Name</label>
                    <p className="text-gray-900 font-medium">{taxpayerInfo?.fullName}</p>
                  </div>
                  <div>
                    <label className="text-gray-600 block mb-1 text-sm">PIN Number</label>
                    <p className="text-gray-900 font-medium">{taxpayerInfo?.pin}</p>
                  </div>
                </div>
                <div>
                  <label className="text-gray-600 block mb-1 text-sm">Filing Year</label>
                  <p className="text-gray-900 font-medium">{getCurrentFilingYear()} <span className="text-gray-500 font-normal">(auto-picked)</span></p>
                </div>
              </div>

              <button
                onClick={handleContinue}
                className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
