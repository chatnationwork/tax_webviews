'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Input, Button, Select, TotalsCard } from '../../_components/Layout';
import { getCreditNote, saveCreditNote, CreditNoteData, calculateTotals } from '../../_lib/store';

const reasonOptions = [
  { value: 'pricing_error', label: 'Pricing error' },
  { value: 'duplicate', label: 'Duplicate invoice' },
  { value: 'returned_goods', label: 'Returned goods' },
  { value: 'other', label: 'Other' },
];

export default function CreditNotePartialAdjust() {
  const router = useRouter();
  const [creditNote, setCreditNote] = useState<CreditNoteData | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = getCreditNote();
    if (!saved || !saved.invoice || saved.type !== 'partial' || !saved.items) {
      router.push('/etims/credit-note/search');
      return;
    }
    setCreditNote(saved);
    
    // Initialize quantities
    const initialQuantities: Record<string, number> = {};
    saved.items.forEach(({ item }) => {
      initialQuantities[item.id] = item.quantity;
    });
    setQuantities(initialQuantities);
  }, [router]);

  const updateQuantity = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const maxQty = creditNote?.items?.find(i => i.item.id === itemId)?.item.quantity || 0;
    setQuantities({
      ...quantities,
      [itemId]: Math.min(Math.max(0, numValue), maxQty),
    });
  };

  const handleReview = () => {
    if (!reason) {
      alert('Please select a reason for the credit note');
      return;
    }

    // Check if at least one item has quantity > 0
    const hasValidQuantity = Object.values(quantities).some(q => q > 0);
    if (!hasValidQuantity) {
      alert('Please set at least one item quantity greater than 0');
      return;
    }

    const updatedItems = creditNote!.items!.map(({ item }) => ({
      item,
      quantity: quantities[item.id] || 0,
    })).filter(({ quantity }) => quantity > 0);

    saveCreditNote({ items: updatedItems, reason });
    router.push('/etims/credit-note/review');
  };

  if (!mounted || !creditNote?.items) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  // Calculate totals based on current quantities
  const creditItems = creditNote.items.map(({ item }) => ({
    ...item,
    quantity: quantities[item.id] || 0,
  })).filter(item => item.quantity > 0);

  const totals = calculateTotals(creditItems);

  return (
    <Layout 
      title="Adjust Quantities" 
      step="Step 4 of 5"
      onBack={() => router.push('/etims/credit-note/partial-select')}
    >
      <div className="space-y-4">
        <Card className="bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            Adjust the quantity to credit for each item (max available shown)
          </p>
        </Card>

        {creditNote.items.map(({ item }) => (
          <Card key={item.id}>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                  {item.type}
                </span>
                <h4 className="text-gray-900 font-medium">{item.name}</h4>
              </div>
              {item.description && (
                <p className="text-sm text-gray-600">{item.description}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                Unit Price: KES {item.unitPrice.toLocaleString()}
              </p>
            </div>
            
            <Input
              label={`Quantity to Credit (max: ${item.quantity})`}
              value={quantities[item.id]?.toString() || '0'}
              onChange={(value) => updateQuantity(item.id, value)}
              type="number"
              required
            />
            
            <div className="mt-2 text-sm text-gray-700">
              Credit Amount: KES {((quantities[item.id] || 0) * item.unitPrice).toLocaleString()}
            </div>
          </Card>
        ))}

        {creditItems.length > 0 && (
          <TotalsCard 
            subtotal={totals.subtotal} 
            tax={totals.tax} 
            total={totals.total} 
          />
        )}

        <Card>
          <Select
            label="Reason for Credit Note"
            value={reason}
            onChange={setReason}
            options={reasonOptions}
            required
          />
        </Card>

        <Button onClick={handleReview} disabled={!reason || creditItems.length === 0}>
          Review Credit Note
        </Button>
      </div>
    </Layout>
  );
}
