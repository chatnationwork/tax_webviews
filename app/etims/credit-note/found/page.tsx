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

        {/* Credit Note Type */}
        <Card>
          <h3 className="text-gray-900 font-medium mb-3">Credit Note Type</h3>
          <div className="space-y-3">
            <button
              onClick={() => setSelectedType('full')}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                selectedType === 'full'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedType === 'full' ? 'border-blue-600' : 'border-gray-400'
                }`}>
                  {selectedType === 'full' && (
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">Full Credit Note</p>
                  <p className="text-sm text-gray-600">Credit the entire invoice amount</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => !isPartialDisabled && setSelectedType('partial')}
              disabled={isPartialDisabled}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                isPartialDisabled
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : selectedType === 'partial'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedType === 'partial' ? 'border-blue-600' : 'border-gray-400'
                }`}>
                  {selectedType === 'partial' && (
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">Partial Credit Note</p>
                  <p className="text-sm text-gray-600">
                    {isPartialDisabled 
                      ? 'Already used for this invoice'
                      : 'Credit specific items or quantities'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </Card>

        <Button onClick={handleContinue} disabled={!selectedType}>
          Continue
        </Button>
      </div>
    </Layout>
  );
}
