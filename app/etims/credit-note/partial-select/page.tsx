'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { getCreditNote, saveCreditNote, InvoiceItem } from '../../_lib/store';
import { ArrowLeft, CheckSquare, Square } from 'lucide-react';
import { useFlowTracking } from '@/app/_components/PostHogProvider';

export default function CreditNotePartialSelect() {
  const router = useRouter();
  
  // Track this step
  useFlowTracking('credit_note', 'partial_select', 3);
  const [invoice, setInvoice] = useState<{ invoiceNumber: string; items: InvoiceItem[]; total: number } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const data = getCreditNote();
    if (!data?.invoice) { router.push('/etims/credit-note/search'); return; }
    setInvoice({ invoiceNumber: data.invoice.invoiceNumber, items: data.invoice.items, total: data.invoice.total });
  }, [router]);

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedItems(newSelected);
  };

  const handleContinue = () => {
    if (selectedItems.size === 0) { alert('Select at least one item'); return; }
    const selectedItemsData = invoice?.items.filter(item => selectedItems.has(item.id)).map(item => ({ 
      item, 
      quantity: item.quantity,
      item_name: item.name,
      total_amount: (item.unitPrice * item.quantity).toFixed(2)
    })) || [];
    saveCreditNote({ items: selectedItemsData });
    router.push('/etims/credit-note/partial-adjust');
  };

  if (!mounted || !invoice) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">Loading...</div>;

  return (
    <Layout title="Select Items" showHeader={false} onBack={() => router.push('/etims/credit-note/search')}>
      <div className="space-y-3">
        {/* Header */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Invoice Details</h1>
          <p className="text-gray-400 text-xs">Invoice: {invoice.invoiceNumber}</p>
        </div>

        {/* Info */}
        <div className="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600">
          Select items to include in credit note
        </div>

        {/* Items Table */}
        <Card>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="w-8 py-1.5"></th>
                <th className="text-left py-1.5 px-1 font-medium text-gray-600">Item</th>
                <th className="text-right py-1.5 px-1 font-medium text-gray-600">Price</th>
                <th className="text-center py-1.5 px-1 font-medium text-gray-600">Qty</th>
                <th className="text-right py-1.5 px-1 font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map(item => {
                const isSelected = selectedItems.has(item.id);
                const price = item.unitPrice || 0;
                const qty = item.quantity || 0;
                return (
                  <tr key={item.id} onClick={() => toggleItem(item.id)} className={`border-b last:border-0 cursor-pointer ${isSelected ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="py-2 px-1">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-[var(--kra-red)]" /> : <Square className="w-4 h-4 text-gray-400" />}
                    </td>
                    <td className="py-2 px-1 text-gray-800">{item.name}</td>
                    <td className="py-2 px-1 text-right text-gray-600">{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-1 text-center text-gray-600">{qty}</td>
                    <td className="py-2 px-1 text-right font-medium">{(price * qty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* Selection Summary */}
        {selectedItems.size > 0 && (
          <div className="bg-[var(--kra-black)] rounded-lg px-3 py-2 flex justify-between items-center text-white text-sm">
            <span>{selectedItems.size} item(s) selected</span>
            <span className="font-bold">
              KES {invoice.items.filter(i => selectedItems.has(i.id)).reduce((sum, i) => sum + (i.unitPrice || 0) * (i.quantity || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={handleContinue} disabled={selectedItems.size === 0}>Edit Selected Items</Button>
          <button onClick={() => router.push('/etims/credit-note/search')} className="w-full py-2 text-[var(--kra-red)] text-xs font-medium flex items-center justify-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />Go Back
          </button>
        </div>
      </div>
    </Layout>
  );
}
