'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Layout, Card, Button } from '../../../_components/Layout';
import { CheckCircle, XCircle } from 'lucide-react';

function BuyerSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action') || 'accepted';
  const isAccepted = action === 'accepted';

  const handleGoHome = () => {
    router.push('/etims/buyer-initiated');
  };

  const handleViewPending = () => {
    router.push('/etims/buyer-initiated/buyer/pending');
  };

  return (
    <Layout title="Success" showMenu={false}>
      <div className="space-y-6">
        <Card className={`${isAccepted ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} text-center py-8`}>
          <div className="flex flex-col items-center space-y-4">
            <div className={`w-16 h-16 ${isAccepted ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
              {isAccepted ? (
                <CheckCircle className="w-10 h-10 text-green-600" />
              ) : (
                <XCircle className="w-10 h-10 text-red-600" />
              )}
            </div>
            <div>
              <h2 className={`${isAccepted ? 'text-green-900' : 'text-red-900'} text-xl font-medium mb-2`}>
                Invoice {isAccepted ? 'Accepted' : 'Rejected'} Successfully!
              </h2>
              <p className={`text-sm ${isAccepted ? 'text-green-700' : 'text-red-700'}`}>
                {isAccepted 
                  ? 'The seller has been notified of your acceptance'
                  : 'The seller has been notified of your rejection'}
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Button onClick={handleViewPending}>
            View Pending Invoices
          </Button>
          <Button variant="secondary" onClick={handleGoHome}>
            Go to Buyer Initiated Menu
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function BuyerInitiatedBuyerSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <BuyerSuccessContent />
    </Suspense>
  );
}
