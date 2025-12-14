'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle, MessageCircle } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';

export function NilResult() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    if (!info.selectedNilType) {
      router.push('/nil-mri-tot/nil/validation');
    }
  }, [router]);

  if (!mounted || !taxpayerInfo?.selectedNilType) {
    return null;
  }

  const handleReturnHome = () => {
    taxpayerStore.clear();
    router.push('/nil-mri-tot');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl p-8 shadow-lg text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-green-900 text-2xl font-bold mb-4">NIL Return Filed Successfully!</h1>

          <p className="text-gray-700 mb-6">
            Your {taxpayerInfo.selectedNilType?.toUpperCase()} NIL return for {taxpayerInfo.fullName} has been filed successfully.
          </p>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-8 flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <p className="text-blue-600">WhatsApp confirmation sent to your registered number</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleReturnHome}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </button>
            <button
              onClick={() => router.push('/nil-mri-tot/nil/select')}
              className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              File Another NIL Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
