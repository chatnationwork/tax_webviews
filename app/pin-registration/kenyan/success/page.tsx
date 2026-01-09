'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Button, SuccessState } from '../../../_components/Layout';
import { FileDown, Menu, Plus } from 'lucide-react';

export default function KenyanSuccess() {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('pin_registration_result');
    if (stored) {
      setResult(JSON.parse(stored));
    }
  }, []);

  const handleDownloadCertificate = () => {
    // In a real implementation, this would download the PDF
    alert('PIN Certificate download will start shortly. Check your email for the certificate.');
  };

  return (
    <Layout title="Registration Successful">
      <SuccessState message="Your PIN has been successfully registered." />

      {result?.pin && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4 text-center">
          <p className="text-sm text-green-800 mb-2">Your KRA PIN:</p>
          <p className="text-2xl font-mono font-bold text-green-900">{result.pin}</p>
        </div>
      )}

      {result?.receiptNumber && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4 text-center">
          <p className="text-xs text-gray-600">Receipt Number: <span className="font-mono">{result.receiptNumber}</span></p>
        </div>
      )}

      <div className="space-y-3 mt-8">
        <Button onClick={handleDownloadCertificate}>
          <div className="flex items-center justify-center gap-2">
            <FileDown className="w-5 h-5" />
            Download PIN Certificate
          </div>
        </Button>
<button
          onClick={() => router.push('/pin-registration/kenyan/identity')}
          className="w-full bg-white border-2 border-gray-300 rounded-xl p-5 hover:border-green-600 hover:bg-green-50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Plus className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-gray-900 font-semibold">Register Another PIN</h3>
            </div>
          </div>
        </button>

        
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 text-center">
          Your PIN certificate has been sent to your registered email address.
        </p>
      </div>
    </Layout>
  );
}
