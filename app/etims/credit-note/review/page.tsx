'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button, TotalsCard } from '../../_components/Layout';
import { getCreditNote, CreditNoteData, calculateTotals } from '../../_lib/store';
import { Loader2 } from 'lucide-react';
import { submitPartialCreditNote } from '../../../actions/etims';
import { CreditNoteReason } from '../../_lib/definitions';

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
        ? creditNote.invoice.items.map(item => ({ item_id: item.id, return_quantity: item.quantity }))
        : (creditNote.items || []).map(item => ({ item_id: item.item.id, return_quantity: item.quantity }));

      const result = await submitPartialCreditNote({
         msisdn: creditNote.msisdn,
         invoice_no: creditNote.invoice.invoiceNumber,
         credit_note_type: isFull ? 'full' : 'partial',
         reason: creditNote.reason as CreditNoteReason,
         items
      });

      if (result.success) {
         router.push('/etims/credit-note/success');
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
      <div className="space-y-4">
        {/* Invoice Summary */}
        <Card>
          <h3 className="text-gray-900 font-medium mb-3">Invoice Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Number:</span>
              <span className="text-gray-900 font-medium">{creditNote.invoice!.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Original Amount:</span>
              <span className="text-gray-900">
                KES {creditNote.invoice!.total.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Credit Type:</span>
              <span className="text-gray-900 font-medium">
                {isFull ? 'Full Credit Note' : 'Partial Credit Note'}
              </span>
            </div>
          </div>
        </Card>

        {/* Items Credited */}
        {isFull ? (
          <Card className="bg-yellow-50 border-yellow-200">
            <p className="text-sm text-yellow-900">
              <strong>All items</strong> from this invoice will be credited
            </p>
          </Card>
        ) : (
          <Card>
            <h3 className="text-gray-900 font-medium mb-3">Items to Credit</h3>
            <div className="space-y-3">
              {creditNote.items?.map(({ item, quantity }) => (
                <div key={item.id} className="pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                  <h4 className="text-gray-900 font-medium mb-1">{item.name}</h4>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                  )}
                  <p className="text-sm text-gray-700">
                    KES {item.unitPrice.toLocaleString()} × {quantity} = KES {(item.unitPrice * quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Reason */}
        <Card>
          <h3 className="text-gray-900 font-medium mb-2">Reason</h3>
          <p className="text-sm text-gray-700">
            {reasonLabels[creditNote.reason!] || creditNote.reason}
          </p>
        </Card>

        {/* Totals */}
        <TotalsCard 
          subtotal={totals.subtotal} 
          tax={totals.tax} 
          total={totals.total} 
        />

        {/* Actions */}
        {isProcessing ? (
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <p className="text-blue-900 font-medium">Processing Credit Note...</p>
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
