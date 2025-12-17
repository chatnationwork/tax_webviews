'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button, TotalsCard } from '../../_components/Layout';
import { getCreditNote, saveCreditNote, CreditNoteData } from '../../_lib/store';

export default function CreditNoteFound() {
  const router = useRouter();
  const [creditNote, setCreditNote] = useState<CreditNoteData | null>(null);
  const [selectedType, setSelectedType] = useState<'full' | 'partial' | ''>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = getCreditNote();
    if (!saved || !saved.invoice) {
      router.push('/etims/credit-note/search');
      return;
    }
    setCreditNote(saved);
  }, [router]);

  const handleContinue = () => {
    if (!selectedType) {
      alert('Please select a credit note type');
      return;
    }

    saveCreditNote({ type: selectedType });
    
    if (selectedType === 'full') {
      router.push('/etims/credit-note/full');
    } else {
      router.push('/etims/credit-note/partial-select');
    }
  };

  if (!mounted || !creditNote?.invoice) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  const { invoice } = creditNote;
  const isPartialDisabled = invoice.partialCreditUsed;

  return (
    <Layout 
      title="Invoice Found" 
      step="Step 2 of 5"
      onBack={() => router.push('/etims/credit-note/search')}
    >
      <div className="space-y-4">
        {/* Invoice Summary */}
        <Card>
          <h3 className="text-gray-900 font-medium mb-3">Invoice Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Number:</span>
              <span className="text-gray-900 font-medium">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="text-gray-900">{invoice.date}</span>
            </div>
            {invoice.buyer && (
              <div className="flex justify-between">
                <span className="text-gray-600">Buyer:</span>
                <span className="text-gray-900">{invoice.buyer.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Items:</span>
              <span className="text-gray-900">{invoice.items.length}</span>
            </div>
          </div>
        </Card>

        <TotalsCard 
          subtotal={invoice.subtotal} 
          tax={invoice.tax} 
          total={invoice.total} 
        />

        
        <Button onClick={handleContinue} disabled={!selectedType}>
          Continue
        </Button>
      </div>
    </Layout>
  );
}
