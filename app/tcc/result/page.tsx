'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Layout, Card, Button } from '../../_components/Layout';
import { WhatsAppButton, QuickMenu } from '../../_components/QuickMenu';
import { taxpayerStore } from '../_lib/store';
import { CheckCircle } from 'lucide-react';

export default function TccResultPage() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [tccData, setTccData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    const tcc = taxpayerStore.getTccApplication();
    setTaxpayerInfo(info);
    setTccData(tcc);
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleReturnHome = () => {
    taxpayerStore.clear();
    router.push('/');
  };

  return (
    <Layout title="Success" showMenu={false} showHeader={false}>
      <div className="space-y-4">
        {/* Success Card */}
        <Card className="bg-green-50 border-green-200 text-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center shadow-sm">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <div className="space-y-3 px-4">
              <h2 className="text-green-900 text-xl font-bold">TCC Application Submitted!</h2>
              
              <div className="text-left bg-white/60 rounded-lg p-4 border border-green-200 space-y-2">
                <p className="text-sm text-green-800">
                  Dear <span className="font-semibold">{taxpayerInfo?.fullName}</span>
                </p>
                <p className="text-sm text-green-800">
                  Your application for a Tax Compliance Certificate (TCC) has been received and processed successfully.
                </p>
                
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">🔹</span>
                    <div>
                      <span className="text-gray-600">KRA PIN:</span>
                      <span className="ml-2 font-mono text-green-800">{taxpayerInfo?.pin}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">🔹</span>
                    <div>
                      <span className="text-gray-600">Tax Payer Name:</span>
                      <span className="ml-2 text-green-800">{taxpayerInfo?.fullName}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">🔹</span>
                    <div>
                      <span className="text-gray-600">Application Reason:</span>
                      <span className="ml-2 text-green-800">{tccData?.reasonForApplication || 'Not specified'}</span>
                    </div>
                  </div>
                  
                  {tccData?.tccNumber && (
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">🔹</span>
                      <div>
                        <span className="text-gray-600">Certificate Number:</span>
                        <span className="ml-2 font-mono font-bold text-green-800">{tccData.tccNumber}</span>
                      </div>
                    </div>
                  )}
                  
                  {tccData?.tccStatus && (
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">🔹</span>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 font-semibold text-green-800">{tccData.tccStatus}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-green-700 bg-green-100/50 px-4 py-2 rounded-full">
              Confirmation sent to registered number
            </p>
          </div>
        </Card>

        {/* WhatsApp Button */}
        <WhatsAppButton label="Download Certificate" />

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button onClick={handleReturnHome}>
            Return to Home
          </Button>
          
          <button 
            onClick={() => router.push('/tcc/validation')}
            className="w-full py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors border border-blue-200"
          >
            Apply for Another TCC
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
