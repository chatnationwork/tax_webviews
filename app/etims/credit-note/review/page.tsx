'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { getCreditNote, CreditNoteData, calculateTotals, getUserSession } from '../../_lib/store';
import { Loader2 } from 'lucide-react';
import { submitCreditNote, sendInvoiceCreditDocTemplate } from '../../../actions/etims';
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

export default function CreditNoteReview() {
  const router = useRouter();
  
  // Track this step
  useFlowTracking('credit_note', 'review', 5);
  const [creditNote, setCreditNote] = useState<CreditNoteData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = getCreditNote();
    if (!saved || !saved.invoice || !saved.type || !saved.reason) {
      router.push('/etims/credit-note/search');
      return;
    }
    setCreditNote(saved);
  }, [router]);

  const handleSubmit = async () => {
    if (!creditNote?.invoice || !creditNote.msisdn || !creditNote.reason) return;
    setIsProcessing(true);
    
    try {
      // Prepare items
      const isFull = creditNote.type === 'full';
      const items = isFull 
        ? creditNote.invoice.items.map(item => ({ item_id: item.id, quantity: item.quantity, taxable_amount: parseFloat(item.total_amount || '0'), item_name: item.item_name }))
        : (creditNote.items || []).map(item => ({ item_id: item.item.id, quantity: item.quantity, taxable_amount: parseFloat(item.total_amount || '0'), item_name: item.item_name }));

      const result = await submitCreditNote({
         msisdn: creditNote.msisdn,
         invoice_no: creditNote.invoice.invoiceNumber,
         credit_note_type: isFull ? 'full' : 'partial',
         reason: creditNote.reason as CreditNoteReason,
         items
      });

      if (result.success) {
         // Send credit note PDF to user via WhatsApp
         if (result.credit_note_pdf_url && creditNote.msisdn) {
           const session = getUserSession();
           const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
           // Calculate credit amount
           const calculatedTotals = isFull
             ? { total: creditNote.invoice!.total }
             : calculateTotals((creditNote.items || []).map(({ item, quantity }) => ({ ...item, quantity })));
           
           const creditAmount = calculatedTotals.total;
           const reference = (result.credit_note_ref || result.credit_note_id || '').trim();
           const recipientName = (session?.name || 'Valued Customer').trim();

//              Dear [Full Name],
 
// Your credit note KRASRN000006245/464 for KES 39,000 was issued on 17 Dec 2025. 
// The credit note PDF is attached for your records.
           await sendInvoiceCreditDocTemplate(
             creditNote.msisdn,
             recipientName,
             `credit note *${reference}*`,
             creditAmount.toLocaleString(),
             today,
             result.credit_note_pdf_url
           );
         }
         router.push(`/etims/credit-note/success?creditNote=${encodeURIComponent(result.credit_note_ref || result.credit_note_id || '')}`);
      } else {
         alert('Failed to submit credit note: ' + (result.error || result.message || 'Unknown error'));
         setIsProcessing(false);
      }
    } catch (err: any) {
         alert('Error submitting credit note: ' + err.message);
         setIsProcessing(false);
    }
  };

  if (!mounted || !creditNote) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  const isFull = creditNote.type === 'full';
  const totals = isFull 
    ? { 
        subtotal: creditNote.invoice!.subtotal,
        tax: creditNote.invoice!.tax,
        total: creditNote.invoice!.total,
      }
    : calculateTotals(
        creditNote.items?.map(({ item, quantity }) => ({
          ...item,
          quantity,
        })) || []
      );

  return (
    <Layout 
      title="Review Credit Note" 
      step="Step 5 of 5"
      onBack={() => {
        if (isFull) {
          router.push('/etims/credit-note/full');
        } else {
          router.push('/etims/credit-note/partial-adjust');
        }
      }}
    >
      <div className="space-y-3">
        {/* Invoice Summary - Compact */}
        <Card className="!p-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <div><span className="text-gray-500">Invoice:</span> <span className="font-medium">{creditNote.invoice!.invoiceNumber}</span></div>
            <div><span className="text-gray-500">Original:</span> <span className="font-medium">KES {creditNote.invoice!.total.toLocaleString()}</span></div>
            <div><span className="text-gray-500">Type:</span> <span className="font-medium">{isFull ? 'Full' : 'Partial'}</span></div>
          </div>
        </Card>

        {/* Items Credited - Table */}
        {isFull ? (
          <Card className="bg-yellow-50 border-yellow-200 !p-2">
            <p className="text-xs text-yellow-900">
              <strong>All items</strong> from this invoice will be credited
            </p>
          </Card>
        ) : (
          <Card className="!p-2">
            <h3 className="text-xs text-gray-600 font-medium mb-2">Items to Credit</h3>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="text-left py-1 px-1 font-medium text-gray-600">Item</th>
                  <th className="text-right py-1 px-1 font-medium text-gray-600">Qty</th>
                  <th className="text-right py-1 px-1 font-medium text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {creditNote.items?.map(({ item, quantity }) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-1.5 px-1 text-gray-900">{item.name}</td>
                    <td className="py-1.5 px-1 text-right text-gray-700">{quantity}</td>
                    <td className="py-1.5 px-1 text-right font-medium">KES {(item.unitPrice * quantity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="py-1.5 px-1 text-right font-medium text-gray-700">Total Credit:</td>
                  <td className="py-1.5 px-1 text-right font-bold text-gray-900">KES {totals.total.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        )}

        {/* Reason - Compact */}
        <Card className="!p-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Reason:</span>
            <span className="font-medium text-gray-900">{reasonLabels[creditNote.reason!] || creditNote.reason}</span>
          </div>
        </Card>

        {/* Actions */}
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
