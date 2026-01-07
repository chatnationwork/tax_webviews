'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../../../_components/Layout';
import { saveBuyerInitiated, getBuyerInitiated, calculateTotals, InvoiceItem } from '../../../_lib/store';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';

export default function BuyerInitiatedDetails() {
  const router = useRouter();
  const [sellerName, setSellerName] = useState('');

  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [invoiceDate] = useState(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));

  useEffect(() => {
    setMounted(true);
    const saved = getBuyerInitiated();
    if (!saved?.sellerName) {
      router.push('/etims/buyer-initiated/buyer/create');
      return;
    }
    setSellerName(saved.sellerName);
    if (saved.items) setItems(saved.items);
  }, [router]);

  const totals = calculateTotals(items);

  const handleAddItem = () => {
    if (!itemName.trim()) { alert('Item name required'); return; }
    if (!description.trim()) { alert('Description required'); return; }
    const price = parseFloat(unitPrice);
    if (isNaN(price) || price <= 0) { alert('Valid price required'); return; }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) { alert('Valid quantity required (greater than 0)'); return; }
    const roundedQty = Math.round(qty * 100) / 100; // Limit to 2dp

    const newItem: InvoiceItem = {
      id: editingId || Date.now().toString(),
      type: itemType, name: itemName.trim(),
      description: description.trim() || undefined,
      unitPrice: price, quantity: roundedQty,
    };

    if (editingId) {
      setItems(items.map(item => item.id === editingId ? newItem : item));
      setEditingId(null);
    } else {
      setItems([...items, newItem]);
    }
    setItemName(''); setDescription(''); setUnitPrice(''); setQuantity('0'); setItemType('product');
  };

  const handleEditItem = (item: InvoiceItem) => {
    setEditingId(item.id); setItemType(item.type); setItemName(item.name);
    setDescription(item.description || ''); setUnitPrice(item.unitPrice.toString()); setQuantity(item.quantity.toString());
  };

  const handleRemoveItem = (id: string) => {
    setDeleteConfirmationId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmationId) {
      setItems(items.filter(item => item.id !== deleteConfirmationId));
      if (editingId === deleteConfirmationId) { setEditingId(null); setItemName(''); setDescription(''); setUnitPrice(''); setQuantity('0'); }
      setDeleteConfirmationId(null);
    }
  };

  const handleContinue = () => {
    if (items.length === 0) { alert('Add at least one item'); return; }
    saveBuyerInitiated({ items, amount: totals.total, taxType: 'non-vat' });
    router.push('/etims/buyer-initiated/buyer/review');
  };

  if (!mounted) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">Loading...</div>;

  return (
    <Layout title="Item Creation" showHeader={false} onBack={() => router.push('/etims/buyer-initiated/buyer/create')}>
      <div className="space-y-3">
        {/* Header */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Item Creation</h1>
          <p className="text-gray-400 text-xs">Step 3/4 • Seller: {sellerName}</p>
        </div>

        {/* Item Type + Tax */}
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <p className="text-[10px] text-gray-500 mb-1.5">ITEM TYPE</p>
            <div className="flex gap-3">
              {(['product', 'service'] as const).map(type => (
                <label key={type} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="itemType"
                    checked={itemType === type}
                    onChange={() => setItemType(type)}
                    className="w-3.5 h-3.5 text-[var(--kra-red)]"
                  />
                  <span className="text-xs text-gray-700">{type === 'product' ? 'Product' : 'Service'}</span>
                </label>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-[10px] text-gray-500 mb-1.5">TAX TYPE</p>
            <div className="py-1.5 bg-gray-100 rounded text-center text-xs font-medium text-gray-700">Non-VAT</div>
          </Card>
        </div>

        {/* Form */}
        <Card>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Item name"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Description <span className="text-red-500">*</span><span className="text-gray-400">({description.length}/600)</span></label>
              <textarea required value={description} onChange={(e) => setDescription(e.target.value.slice(0, 600))} rows={2}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg resize-none" />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              <span><b>Invoice Date: {invoiceDate} </b></span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Unit Price <span className="text-red-500">*</span></label>
                <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Quantity <span className="text-red-500">*</span></label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" min="0.01" step="0.01"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg" />
              </div>
            </div>
          </div>
          <button onClick={handleAddItem}
            className="w-full mt-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-center gap-1">
            {editingId ? <><Edit2 className="w-3.5 h-3.5" />Update</> : <><Plus className="w-3.5 h-3.5" />Add Item</>}
          </button>
        </Card>

        {/* Items Table */}
        {items.length > 0 && (
          <Card>
            <p className="text-xs font-medium text-gray-700 mb-2">Items ({items.length})</p>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="text-left py-1.5 px-1 font-medium text-gray-600">Item</th>
                  <th className="text-center py-1.5 px-1 font-medium text-gray-600">Qty</th>
                  <th className="text-right py-1.5 px-1 font-medium text-gray-600">Total</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-1.5 px-1 text-gray-800">{item.name}</td>
                    <td className="py-1.5 px-1 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-1.5 px-1 text-right font-medium">{(item.unitPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-1 text-right">
                        <div className="flex justify-end gap-1">
                          {deleteConfirmationId === item.id ? (
                             <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg animate-in slide-in-from-right-5 duration-200">
                               <span className="text-xs text-red-600 font-medium pl-1">Delete?</span>
                               <div className="flex gap-2">
                                 <button
                                   onClick={confirmDelete}
                                   className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 font-medium shadow-sm active:scale-95 transition-all"
                                 >
                                   Yes
                                 </button>
                                 <button
                                   onClick={() => setDeleteConfirmationId(null)}
                                   className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-50 font-medium shadow-sm active:scale-95 transition-all"
                                 >
                                   No
                                 </button>
                               </div>
                             </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditItem(item)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-[var(--kra-black)] text-white">
                <tr>
                  <td colSpan={2} className="py-2 px-1 font-medium">Total</td>
                  <td colSpan={2} className="py-2 px-1 text-right font-bold">KES {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        )}

        {items.length > 0 && (
          <Button onClick={handleContinue}>Continue</Button>
        )}
      </div>
    </Layout>
  );
}
