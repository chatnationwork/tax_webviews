'use client';

import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../_components/Layout';
import { CheckCircle } from 'lucide-react';
import { clearSalesInvoice } from '../../_lib/store';

export default function SalesInvoiceSuccess() {
  const router = useRouter();

  const handleGoHome = () => {
    clearSalesInvoice();
    router.push('/etims');
  };

  const handleCreateAnother = () => {
    clearSalesInvoice();
    router.push('/etims/sales-invoice/buyer');
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
              <h2 className="text-green-900 text-xl font-medium mb-2">Invoice Submitted Successfully!</h2>
              <p className="text-sm text-green-700">
                Invoice has been generated and PDF delivered via WhatsApp
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Button onClick={handleCreateAnother}>
            Create Another Invoice
          </Button>
          <Button variant="secondary" onClick={handleGoHome}>
            Go to Main Menu
          </Button>
        </div>
      </div>
    </Layout>
  );
}
