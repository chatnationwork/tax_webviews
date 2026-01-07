'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Input, Button } from '../../../_components/Layout';
import { saveSalesInvoice, getSalesInvoice, calculateTotals, InvoiceItem } from '../../_lib/store';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const MAX_DESCRIPTION_LENGTH = 600;

export default function SalesInvoiceDetails() {
  const router = useRouter();
  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = getSalesInvoice();
    if (saved?.items) {
      setItems(saved.items);
    }
  }, []);

  const totals = calculateTotals(items);

  const handleDescriptionChange = (value: string) => {
    // Limit description to 600 characters
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(value);
    }
  };

  const handleAddItem = () => {
    // Validate each field with specific error messages
    if (!itemName.trim()) {
      alert('Item name is required. Please enter a name for this item.');
      return;
    }
    
    if (!unitPrice || unitPrice.trim() === '') {
      alert('Unit price is required. Please enter the price for this item.');
      return;
    }
    
    const price = parseFloat(unitPrice);
    if (isNaN(price) || price <= 0) {
      alert('Invalid price. Please enter a price greater than 0.');
      return;
    }
    
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Invalid quantity. Please enter a quantity greater than 0.');
      return;
    }
    const roundedQty = Math.round(qty * 100) / 100; // Limit to 2dp

    const newItem: InvoiceItem = {
      id: editingId || Date.now().toString(),
      type: itemType,
      name: itemName.trim(),
      description: description.trim() || undefined,
      unitPrice: price,
      quantity: roundedQty,
    };

    if (editingId) {
      setItems(items.map(item => item.id === editingId ? newItem : item));
      setEditingId(null);
    } else {
      setItems([...items, newItem]);
    }

    // Reset form
    setItemName('');
    setDescription('');
    setUnitPrice('');
    setQuantity('0');
    setItemType('product');
  };

  const handleEditItem = (item: InvoiceItem) => {
    setEditingId(item.id);
    setItemType(item.type);
    setItemName(item.name);
    setDescription(item.description || '');
    setUnitPrice(item.unitPrice.toString());
    setQuantity(item.quantity.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveItem = (id: string) => {
    setDeleteConfirmationId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmationId) {
      setItems(items.filter(item => item.id !== deleteConfirmationId));
      if (editingId === deleteConfirmationId) {
        setEditingId(null);
        setItemName('');
        setDescription('');
        setUnitPrice('');
        setQuantity('0');
      }
      setDeleteConfirmationId(null);
    }
  };

  const handleReview = () => {
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }
    saveSalesInvoice({ items, ...totals });
    router.push('/etims/sales-invoice/review');
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout 
      title="Invoice Details" 
      step="Step 2 of 3"
      onBack={() => router.push('/etims/sales-invoice/buyer')}
    >
      <div className="space-y-3">
        {/* Item Type - Radio buttons for mobile */}
        <Card>
          <p className="text-xs text-gray-600 mb-2 font-medium">Item Type</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="itemType"
                checked={itemType === 'product'}
                onChange={() => setItemType('product')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">Product</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="itemType"
                checked={itemType === 'service'}
                onChange={() => setItemType('service')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">Service</span>
            </label>
          </div>
        </Card>

        {/* Item Details - Compact inputs for mobile */}
        <Card>
          <h3 className="text-sm text-gray-900 font-medium mb-3">Item Details</h3>
          <div className="space-y-3">
            <Input
              label="Item Name"
              value={itemName}
              onChange={setItemName}
              placeholder="Enter item name"
              required
            />
            
            {/* Description with character counter */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Optional description"
                maxLength={MAX_DESCRIPTION_LENGTH}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <p className={`text-xs mt-1 text-right ${
                description.length >= MAX_DESCRIPTION_LENGTH ? 'text-red-500' : 'text-gray-400'
              }`}>
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </p>
            </div>

            {/* Price and Quantity in a row for mobile */}
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Unit Price (KES)"
                value={unitPrice}
                onChange={setUnitPrice}
                placeholder="0.00"
                type="number"
                required
              />
              <Input
                label="Quantity"
                value={quantity}
                onChange={setQuantity}
                placeholder="0"
                type="number"
                step="0.01"
                min="0.01"
                required
              />
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={handleAddItem}>
              {editingId ? (
                <>
                  <Edit2 className="w-4 h-4 inline mr-1" />
                  Update Item
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Item
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Items List - Compact table format */}
        {items.length > 0 && (
          <Card>
            <h3 className="text-sm text-gray-900 font-medium mb-2">Items ({items.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs text-gray-500 font-medium">Item</th>
                    <th className="text-right py-2 text-xs text-gray-500 font-medium">Price</th>
                    <th className="text-center py-2 text-xs text-gray-500 font-medium">Qty</th>
                    <th className="text-right py-2 text-xs text-gray-500 font-medium">Total</th>
                    <th className="text-right py-2 text-xs text-gray-500 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 text-gray-900 font-medium text-xs">{item.name}</td>
                      <td className="text-right py-2 text-xs text-gray-700">
                        {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-center py-2 text-xs text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="text-right py-2 text-xs text-gray-900 font-medium">
                        {(item.unitPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right py-2">
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
                                aria-label="Edit item"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                aria-label="Remove item"
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
                    <td colSpan={3} className="py-2 px-1 font-medium text-sm">Total</td>
                    <td colSpan={2} className="py-2 px-1 text-right font-bold text-sm">KES {items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}

     

        {/* Review Button */}
        <Button 
          onClick={handleReview} 
          disabled={items.length === 0}
          className={items.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''}
        >
          Continue
        </Button>
      </div>
    </Layout>
  );
}
