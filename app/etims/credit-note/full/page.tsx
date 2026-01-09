'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { getCreditNote, CreditNoteData, getUserSession } from '../../_lib/store';
import { Loader2 } from 'lucide-react';
import { submitCreditNote,sendInvoiceCreditDocTemplate } from '../../../actions/etims';
import { CreditNoteReason } from '../../_lib/definitions';
import { useFlowTracking } from '@/app/_components/PostHogProvider';

const reasonLabels: Record<string, string> = {
  missing_quantity: 'Missing Quantity',
  missing_data: 'Missing Data',
  damaged: 'Damaged',
  wasted: 'Wasted',
  raw_material_shortage: 'Raw Material Shortage',
  refund: 'Refund',
};

export default function CreditNoteFull() {
  const router = useRouter();
  
  // Track this step
  useFlowTracking('credit_note', 'full', 3);
  const [creditNote, setCreditNote] = useState<CreditNoteData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    const saved = getCreditNote();
    if (!saved || !saved.invoice || saved.type !== 'full' || !saved.reason) {
      router.push('/etims/credit-note/search');
      return;
    }
    setCreditNote(saved);
  }, [router]);

  const handleSubmit = async () => {
    if (!creditNote?.invoice || !creditNote.msisdn || !creditNote.reason) return;
    setIsProcessing(true);
    setError('');
    
    try {
      // Prepare items for full credit note
      const items = creditNote.invoice.items.map(item => ({ 
        item_id: item.id, 
        quantity: item.quantity,
        item_name: item.name
      }));

      const result = await submitCreditNote({
        msisdn: creditNote.msisdn,
        invoice_no: creditNote.invoice.invoiceNumber,
        credit_note_type: 'full',
        reason: creditNote.reason as CreditNoteReason,
        items
      });

      if (result.success) {
        // Send credit note PDF to user via WhatsApp
        if (result.credit_note_pdf_url && creditNote.msisdn) {
          const session = getUserSession();
          const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

          await sendInvoiceCreditDocTemplate(
            creditNote.msisdn,
            session?.name || 'Valued Customer',
            `credit note *${result.credit_note_ref || result.credit_note_id}*`,
            creditNote.invoice.total.toLocaleString(),
            today,
            result.credit_note_pdf_url
          );
        }
        router.push(`/etims/credit-note/success?creditNote=${encodeURIComponent(result.credit_note_ref || result.credit_note_id || '')}`);
      } else {
        setError(result.error || result.message || 'Failed to submit credit note');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting credit note');
      setIsProcessing(false);
    }
  };

  if (!mounted || !creditNote?.invoice) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout 
      title="Full Credit Note" 
      step="Step 3 of 4"
      onBack={() => router.push('/etims/credit-note/search')}
    >
      <div className="space-y-3">
        {/* Invoice Summary - Compact */}
        <Card className="!p-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <div><span className="text-gray-500">Invoice:</span> <span className="font-medium">{creditNote.invoice.invoiceNumber}</span></div>
            <div><span className="text-gray-500">Amount:</span> <span className="font-medium">KES {creditNote.invoice.total.toLocaleString()}</span></div>
          </div>
        </Card>

        {/* Reason - Compact */}
        <Card className="!p-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Reason:</span>
            <span className="font-medium text-gray-900">{reasonLabels[creditNote.reason!] || creditNote.reason}</span>
          </div>
        </Card>

        {/* Full Credit Note Notice */}
        <Card className="bg-yellow-50 border-yellow-200 !p-3">
          <p className="text-sm text-yellow-900">
            <strong>Full Credit Note:</strong> This will credit the entire invoice amount of <strong>KES {creditNote.invoice.total.toLocaleString()}</strong>.
          </p>
        </Card>

        {/* Error */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        {isProcessing ? (
          <Card className="bg-blue-50 border-blue-200 !p-2">
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-900 font-medium">Processing...</p>
            </div>
          </Card>
        ) : (
          <Button onClick={handleSubmit}>
            Submit Credit Note
          </Button>
        )}
      </div>
    </Layout>
  );
}
