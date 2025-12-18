'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../_components/Layout';
import { getCreditNote, saveCreditNote, calculateTotals, InvoiceItem } from '../../_lib/store';
import { Minus, Plus, Send, ArrowLeft } from 'lucide-react';

export default function CreditNotePartialAdjust() {
  const router = useRouter();
  const [items, setItems] = useState<Array<{ item: InvoiceItem; quantity: number; maxQty: number }>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const data = getCreditNote();
    if (!data?.items || data.items.length === 0) { router.push('/etims/credit-note/partial-select'); return; }
    setItems(data.items.map(i => ({ item: i.item, quantity: i.quantity, maxQty: i.item.quantity })));
  }, [router]);

  const updateQuantity = (id: string, delta: number) => {
    setItems(items.map(i => {
      if (i.item.id !== id) return i;
      let newQty = i.quantity + delta;
      newQty = Math.round(newQty * 100) / 100; // Round to 2dp
      newQty = Math.max(0.01, Math.min(i.maxQty, newQty));
      return { ...i, quantity: newQty };
    }));
  };

  const setQuantity = (id: string, value: string) => {
    let qty = parseFloat(value);
    if (isNaN(qty)) qty = 0;
    qty = Math.round(qty * 100) / 100; // Round to 2dp
    setItems(items.map(i => i.item.id === id ? { ...i, quantity: Math.max(0.01, Math.min(i.maxQty, qty)) } : i));
  };

  const handleSubmit = () => {
    saveCreditNote({ items: items.map(i => ({ item: i.item, quantity: i.quantity })) });
    router.push('/etims/credit-note/review');
  };

  if (!mounted || items.length === 0) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">Loading...</div>;

  const totalCredit = items.reduce((sum, i) => sum + i.item.unitPrice * i.quantity, 0);

  return (
    <Layout title="Edit Credit Note" showHeader={false} onBack={() => router.push('/etims/credit-note/partial-select')}>
      <div className="space-y-3">
        {/* Header */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Edit Credit Note</h1>
          <p className="text-gray-400 text-xs">Adjust quantities for credit</p>
        </div>

        {/* Items */}
        {items.map(({ item, quantity, maxQty }) => (
          <Card key={item.id}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-500">KES {item.unitPrice.toLocaleString()} × {quantity}</p>
              </div>
              <p className="text-sm font-bold text-[var(--kra-red)]">KES {(item.unitPrice * quantity).toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Max: {maxQty}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, -1)} disabled={quantity <= 0.01}
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg disabled:opacity-50">
                  <Minus className="w-4 h-4" />
                </button>
                <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(item.id, e.target.value)} min={0.01} max={maxQty}
                  className="w-12 h-8 text-center text-sm border border-gray-300 rounded-lg" />
                <button onClick={() => updateQuantity(item.id, 1)} disabled={quantity >= maxQty}
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {/* Total */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Total Credit</span>
            <span className="text-xl font-bold">KES {totalCredit.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={handleSubmit}
            className="w-full py-2.5 bg-[var(--kra-red)] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />Submit Credit Note
          </button>
          <button onClick={() => router.push('/etims/credit-note/partial-select')} className="w-full py-2 text-gray-600 text-xs font-medium flex items-center justify-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />Back to Details
          </button>
        </div>
      </div>
    </Layout>
  );
}
