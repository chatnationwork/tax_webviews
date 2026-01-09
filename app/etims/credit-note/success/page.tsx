'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { QuickMenu, WhatsAppButton } from '../../../_components/QuickMenu';
import { CheckCircle } from 'lucide-react';
import { clearCreditNote } from '../../_lib/store';
import { trackFlowCompleted } from '@/app/_components/PostHogProvider';

function CreditNoteSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const creditNoteNo = searchParams.get('creditNote') || '';
  
  // Track flow completion on mount
  useEffect(() => {
    trackFlowCompleted('credit_note');
  }, []);

  const handleCreateAnother = () => {
    clearCreditNote();
    router.push('/etims/credit-note/search');
  };

  return (
    <Layout title="Success" showMenu={false}>
      <div className="space-y-4">
        {/* Success Card */}
        <Card className="bg-green-50 border-green-200 text-center py-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-green-900 text-lg font-medium mb-1">Credit Note Generated</h2>
              
              <p className="text-xs text-green-700">
                Your credit note {creditNoteNo && (
                <p className="text-sm font-semibold text-green-800 mb-2">{creditNoteNo}</p>
              )} has been created. We have delivered the invoice acknowledgement as a PDF to your WhatsApp and sent an SMS with a link to access the invoice.
              </p>
            </div>
          </div>
        </Card>

        {/* WhatsApp Button */}
        <WhatsAppButton label="Open in WhatsApp" />

        {/* Create Another */}
        <Button onClick={handleCreateAnother}>
          Create Another Credit Note
        </Button>

        {/* Quick Menu */}
        <div className="pt-2">
          <p className="text-xs text-gray-500 mb-2 text-center">Quick Actions</p>
          <QuickMenu />
        </div>
      </div>
    </Layout>
  );
}

export default function CreditNoteSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <CreditNoteSuccessContent />
    </Suspense>
  );
}
