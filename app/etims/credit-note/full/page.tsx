'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Select, Button } from '../../_components/Layout';
import { getCreditNote, saveCreditNote, CreditNoteData } from '../../_lib/store';

const reasonOptions = [
  { value: 'missing_quantity', label: 'Missing Quantity' },
  { value: 'missing_data', label: 'Missing Data' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'wasted', label: 'Wasted' },
  { value: 'raw_material_shortage', label: 'Raw Material Shortage' },
  { value: 'refund', label: 'Refund' },
];

export default function CreditNoteFull() {
  const router = useRouter();
  const [creditNote, setCreditNote] = useState<CreditNoteData | null>(null);
  const [reason, setReason] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = getCreditNote();
    if (!saved || !saved.invoice || saved.type !== 'full') {
      router.push('/etims/credit-note/search');
      return;
    }
    setCreditNote(saved);
  }, [router]);

  const handleReview = () => {
    if (!reason) {
      alert('Please select a reason for the credit note');
      return;
    }

    saveCreditNote({ reason });
    router.push('/etims/credit-note/review');
  };

  if (!mounted || !creditNote?.invoice) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout 
      title="Full Credit Note" 
      step="Step 3 of 5"
      onBack={() => router.push('/etims/credit-note/found')}
    >
      <div className="space-y-4">
        <Card>
          <h3 className="text-gray-900 font-medium mb-3">Invoice Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Number:</span>
              <span className="text-gray-900 font-medium">{creditNote.invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="text-gray-900 font-medium">
                KES {creditNote.invoice.total.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-900">
            <strong>Full Credit Note:</strong> This will credit the entire invoice amount of KES {creditNote.invoice.total.toLocaleString()}.
          </p>
        </Card>

        <Card>
          <Select
            label="Reason for Credit Note"
            value={reason}
            onChange={setReason}
            options={reasonOptions}
            required
          />
        </Card>

        <Button onClick={handleReview} disabled={!reason}>
          Review Credit Note
        </Button>
      </div>
    </Layout>
  );
}
