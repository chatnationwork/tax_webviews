'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { getCreditNote, saveCreditNote, calculateTotals, InvoiceItem } from '../../_lib/store';
import { Send, ArrowLeft, AlertCircle } from 'lucide-react';
import { useFlowTracking } from '@/app/_components/PostHogProvider';

export default function CreditNotePartialAdjust() {
  const router = useRouter();
  
  // Track this step
  useFlowTracking('credit_note', 'partial_adjust', 4);
  // Store displayQty (string) separately to allow typing "1." without it becoming "1"
  const [items, setItems] = useState<Array<{ item: InvoiceItem; quantity: number; displayQty: string; maxQty: number }>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const data = getCreditNote();
    if (!data?.items || data.items.length === 0) { router.push('/etims/credit-note/partial-select'); return; }
    setItems(data.items.map(i => ({ 
      item: i.item, 
      quantity: i.quantity, 
      displayQty: i.quantity.toString(),
      maxQty: i.item.quantity 
    })));
  }, [router]);

  const handleQtyChange = (id: string, val: string) => {
    setItems(items.map(i => {
      if (i.item.id !== id) return i;
      
      // Update displayQty immediately to show what user types
      const newItem = { ...i, displayQty: val };
      
      // Try to parse for live total calculation (if valid number)
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        newItem.quantity = parsed; // Don't clamp yet while typing
      }
      return newItem;
    }));
  };

  const handleQtyBlur = (id: string) => {
    setItems(items.map(i => {
      if (i.item.id !== id) return i;

      let val = parseFloat(i.displayQty);
      if (isNaN(val)) val = 0;
      
      // Clamp and Round on blur
      val = Math.round(val * 100) / 100;
      // Only enforce minimum, allow max to be exceeded to show error
      val = Math.max(0.01, val);

      return {
        ...i,
        quantity: val,
        displayQty: val.toString() // Sync back display
      };
    }));
  };

  const handleSubmit = () => {
    saveCreditNote({ 
      items: items.map(i => ({ 
        item: i.item, 
        quantity: i.quantity,
        item_name: i.item.name,
        total_amount: (i.item.unitPrice * i.quantity).toFixed(2)
      })) 
    });
    router.push('/etims/credit-note/review');
  };

  if (!mounted || items.length === 0) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">Loading...</div>;

  const totalCredit = items.reduce((sum, i) => sum + i.item.unitPrice * i.quantity, 0);
  const hasErrors = items.some(i => i.quantity > i.maxQty);

  return (
    <Layout title="Edit Credit Note" showHeader={false} onBack={() => router.push('/etims/credit-note/partial-select')}>
      <div className="space-y-3">
        {/* Header */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Edit Credit Note</h1>
          <p className="text-gray-400 text-xs">Adjust quantities for credit</p>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-800">
            Please ensure all quantities entered are less than the quantities on the original invoice.
          </p>
        </div>

        {/* Items */}
        {items.map(({ item, quantity, displayQty, maxQty }) => (
          <Card key={item.id}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-medium text-gray-800 mb-1">{item.name}</p>
                <div className="flex gap-2">
                   <div className="bg-gray-100 px-2 py-1 rounded text-[10px] text-gray-500 font-medium">
                     Max: {maxQty}
                   </div>
                   <div className="bg-blue-50 px-2 py-1 rounded text-[10px] text-blue-600 font-medium">
                     @{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                   </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[var(--kra-red)]">KES {(item.unitPrice * quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Quantity to Credit</label>
              <input 
                type="number" 
                inputMode="decimal"
                step="0.01" 
                value={displayQty} 
                max={maxQty}
                min={0}
                onChange={(e) => handleQtyChange(item.id, e.target.value)} 
                onBlur={() => handleQtyBlur(item.id)}
                className={`w-full px-3 py-3 text-base border rounded-lg outline-none transition-all ${quantity > maxQty ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[var(--kra-red)] focus:border-transparent focus:ring-2'}`}
                placeholder={`Max ${maxQty}`}
              />
              {quantity > maxQty && (
                <p className="text-red-500 text-xs mt-1 font-medium">
                  Enter a quantity equal to or less than the original invoice quantity {maxQty}
                </p>
              )}
            </div>
          </Card>
        ))}

        {/* Total */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Total Credit</span>
            <span className="text-xl font-bold">KES {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={handleSubmit}
            disabled={hasErrors}
            className={`w-full py-2.5 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${hasErrors ? 'bg-gray-400 cursor-not-allowed' : 'bg-[var(--kra-red)]'}`}>
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
