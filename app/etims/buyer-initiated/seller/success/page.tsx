'use client';

import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { clearBuyerInitiated } from '../../../_lib/store';
import { CheckCircle } from 'lucide-react';

export default function BuyerInitiatedSellerSuccess() {
  const router = useRouter();

  const handleGoHome = () => {
    clearBuyerInitiated();
    router.push('/etims/buyer-initiated');
  };

  const handleCreateAnother = () => {
    clearBuyerInitiated();
    router.push('/etims/buyer-initiated/seller/create');
  };

  return (
    <Layout title="Success" showMenu={false}>
      <div className="space-y-6">
        <Card className="bg-green-50 border-green-200 text-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-green-900 text-xl font-medium mb-2">Invoice Sent to Buyer!</h2>
              <p className="text-sm text-green-700">
                The buyer will receive a notification to review and accept the invoice
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Button onClick={handleCreateAnother}>
            Create Another Invoice
          </Button>
          <Button variant="secondary" onClick={handleGoHome}>
            Go to Buyer Initiated Menu
          </Button>
        </div>
      </div>
    </Layout>
  );
}
