'use client';

import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../_components/Layout';
import { CheckCircle } from 'lucide-react';
import { clearCreditNote } from '../../_lib/store';

export default function CreditNoteSuccess() {
  const router = useRouter();

  const handleGoHome = () => {
    clearCreditNote();
    router.push('/etims');
  };

  const handleCreateAnother = () => {
    clearCreditNote();
    router.push('/etims/credit-note/search');
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
              <h2 className="text-green-900 text-xl font-medium mb-2">Credit Note Submitted Successfully!</h2>
              <p className="text-sm text-green-700">
                Credit note has been processed and PDF delivered via WhatsApp
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Button onClick={handleCreateAnother}>
            Create Another Credit Note
          </Button>
          <Button variant="secondary" onClick={handleGoHome}>
            Go to Main Menu
          </Button>
        </div>
      </div>
    </Layout>
  );
}
