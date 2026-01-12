'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Layout, Card, Button } from '../../../_components/Layout';
import { WhatsAppButton, QuickMenu } from '../../../_components/QuickMenu';
import { taxpayerStore } from '../../_lib/store';
import { CheckCircle } from 'lucide-react';

export default function NilResultPage() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    // Optional: redirect if no filing info
    // if (!info.selectedNilType) {
    //   router.push('/nil-mri-tot/nil/validation');
    // }
  }, []); // Empty dependency array to run only once on mount

  if (!mounted) {
    return null;
  }

  const handleReturnHome = async () => {
    const phone = taxpayerStore.getMsisdn() || localStorage.getItem('phone_Number');
    taxpayerStore.clear();
    router.push(`/?msisdn=${phone || ''}`);
  };

  return (
    <Layout title="Success" showHeader={false}>
      <div className="space-y-4">
        {/* Success Card */}
        <Card className="bg-green-50 border-green-200 text-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center shadow-sm">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-green-900 text-xl font-bold mb-2">Filing Successful!</h2>
              <p className="text-sm text-green-800 px-4">
                Your <span className="font-semibold">{taxpayerInfo?.selectedNilType?.toUpperCase()} NIL return</span> for {taxpayerInfo?.fullName} has been filed.
              </p>
              
              {/* Receipt Number Display if available */}
              {(taxpayerStore as any).receiptNumber && (
                <div className="mt-4 bg-white/60 px-4 py-2 rounded-lg inline-block border border-green-200">
                  <p className="text-xs text-green-600 uppercase font-semibold">Receipt Number</p>
                  <p className="text-lg font-mono text-green-800">{(taxpayerStore as any).receiptNumber}</p>
                </div>
              )}
            </div>

            <p className="text-xs text-green-700 bg-green-100/50 px-4 py-2 rounded-full">
              Confirmation sent to your registered number
            </p>
          </div>
        </Card>

        {/* WhatsApp Button */}
        <WhatsAppButton label="Download Receipt" />

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button onClick={handleReturnHome}>
            Return to Home
          </Button>
          
          <button 
            onClick={() => {
               const phone = taxpayerStore.getMsisdn() || localStorage.getItem('phone_Number');
               router.push(`/nil-mri-tot/nil/validation${phone ? `?phone=${phone}` : ''}`);
            }}
            className="w-full py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors border border-blue-200"
          >
            File Another Return
          </button>
        </div>

        {/* Quick Menu */}
        <div className="pt-4 border-t border-gray-100 mt-4">
          <p className="text-xs text-gray-500 mb-3 text-center">Quick Actions</p>
          <QuickMenu />
        </div>
      </div>
    </Layout>
  );
}
