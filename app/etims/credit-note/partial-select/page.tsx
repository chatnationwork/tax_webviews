'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../_components/Layout';
import { getCreditNote, saveCreditNote, CreditNoteData } from '../../_lib/store';
import { Check } from 'lucide-react';

export default function CreditNotePartialSelect() {
  const router = useRouter();
  const [creditNote, setCreditNote] = useState<CreditNoteData | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = getCreditNote();
    if (!saved || !saved.invoice || saved.type !== 'partial') {
      router.push('/etims/credit-note/search');
      return;
    }
    setCreditNote(saved);
  }, [router]);

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleProceed = () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one item');
      return;
    }

    const items = creditNote!.invoice!.items
      .filter(item => selectedItems.has(item.id))
      .map(item => ({ item, quantity: item.quantity }));

    saveCreditNote({ items });
    router.push('/etims/credit-note/partial-adjust');
  };

  if (!mounted || !creditNote?.invoice) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout 
      title="Select Items" 
      step="Step 3 of 5"
      onBack={() => router.push('/etims/credit-note/found')}
    >
      <div className="space-y-4">
        <Card className="bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            Select the items you want to include in the credit note
          </p>
        </Card>

        <div className="space-y-3">
          {creditNote.invoice.items.map((item) => {
            const isSelected = selectedItems.has(item.id);
            
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-400 bg-white'
                  }`}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 font-medium">
                        {item.type}
                      </span>
                      <h4 className="text-gray-900 font-medium">{item.name}</h4>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Available: {item.quantity} units
                      </span>
                      <span className="text-gray-900 font-medium">
                        KES {(item.unitPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Button onClick={handleProceed} disabled={selectedItems.size === 0}>
          Proceed ({selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected)
        </Button>
      </div>
    </Layout>
  );
}
