'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { clearBuyerInitiated } from '../../../_lib/store';
import { CheckCircle } from 'lucide-react';
import { QuickMenu, WhatsAppButton } from '@/app/etims/_components/QuickMenu';
import { trackFlowCompleted } from '@/app/_components/PostHogProvider';

function BuyerInitiatedSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceNo = searchParams.get('invoice') || '';

  const sellerName = searchParams.get('seller') || '';
  
  // Track flow completion on mount
  useEffect(() => {
    trackFlowCompleted('buyer_initiated_buyer');
  }, []);
  
  const handleCreateAnother = () => {
    clearBuyerInitiated();
    router.push('/etims/buyer-initiated/buyer/create');
  };

  return (
    <Layout title="Success" showMenu={false}>
      <div className="space-y-4">
        <Card className="bg-green-50 border-green-200 text-center py-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-green-900 text-lg font-medium mb-1">
                {invoiceNo ? `Invoice ${invoiceNo} Sent to Seller` : 'Invoice Sent to Seller'}
              </h2>
              <p className="text-xs text-green-700">
                Your invoice {invoiceNo && (
                <span className="font-semibold text-green-800">{invoiceNo}</span>
              )} has been successfully created and sent to {sellerName ? <span className="font-semibold text-green-800">{sellerName}</span> : 'the seller'}.
              </p>
            </div>
          </div>
        </Card>

        {/* WhatsApp Button */}
        <WhatsAppButton label="Open in WhatsApp" />

        <div className="space-y-3">
          <Button onClick={handleCreateAnother}>
            Create Another Invoice
          </Button>
        </div>
        
        {/* Quick Menu */}
        <div className="pt-2">
          <p className="text-xs text-gray-500 mb-2 text-center">Quick Actions</p>
          <QuickMenu />
        </div>
      </div>
    </Layout>
  );
}

export default function BuyerInitiatedSellerSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <BuyerInitiatedSuccessContent />
    </Suspense>
  );
}
