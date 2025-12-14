'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Input, Button, TotalsCard, IdentityStrip } from '../../../_components/Layout';
import { saveBuyerInitiated, getBuyerInitiated, calculateTotals, InvoiceItem } from '../../../_lib/store';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function BuyerInitiatedSellerDetails() {
  const router = useRouter();
  const [buyerName, setBuyerName] = useState('');
  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = getBuyerInitiated();
    if (!saved?.buyerName) {
      router.push('/etims/buyer-initiated/seller/create');
      return;
    }
    setBuyerName(saved.buyerName);
    if (saved.items) {
      setItems(saved.items);
    }
  }, [router]);

  const totals = calculateTotals(items);

  const handleAddItem = () => {
    if (!itemName.trim() || !unitPrice || parseFloat(unitPrice) <= 0 || parseInt(quantity) <= 0) {
      alert('Please fill in all required fields with valid values');
      return;
    }

    const newItem: InvoiceItem = {
      id: editingId || Date.now().toString(),
      type: itemType,
      name: itemName.trim(),
      description: description.trim() || undefined,
      unitPrice: parseFloat(unitPrice),
      quantity: parseInt(quantity),
    };

    if (editingId) {
      setItems(items.map(item => item.id === editingId ? newItem : item));
      setEditingId(null);
    } else {
      setItems([...items, newItem]);
    }

    setItemName('');
    setDescription('');
    setUnitPrice('');
    setQuantity('1');
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
    if (window.confirm('Are you sure you want to remove this item?')) {
      setItems(items.filter(item => item.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setItemName('');
        setDescription('');
        setUnitPrice('');
        setQuantity('1');
      }
    }
  };

  const handleReview = () => {
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }
    saveBuyerInitiated({ items, amount: totals.total });
    router.push('/etims/buyer-initiated/seller/review');
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout 
      title="Item Details" 
      step="Step 2 of 3"
      onBack={() => router.push('/etims/buyer-initiated/seller/create')}
    >
      <div className="space-y-4">
        <IdentityStrip label="Buyer" value={buyerName} />

        <Card>
          <p className="text-sm text-gray-700 mb-3 font-medium">Item Type</p>
          <div className="flex gap-3">
            <button
              onClick={() => setItemType('product')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors font-medium ${
                itemType === 'product'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              Product
            </button>
            <button
              onClick={() => setItemType('service')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors font-medium ${
                itemType === 'service'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              Service
            </button>
          </div>
        </Card>

        <Card>
          <h3 className="text-gray-900 font-medium mb-4">Item Details</h3>
          <div className="space-y-4">
            <Input
              label="Item Name"
              value={itemName}
              onChange={setItemName}
              placeholder="Enter item name"
              required
            />
            <Input
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Optional description"
            />
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
              placeholder="1"
              type="number"
              required
            />
          </div>
          <div className="mt-4">
            <Button onClick={handleAddItem}>
              {editingId ? (
                <>
                  <Edit2 className="w-4 h-4 inline mr-2" />
                  Update Item
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Item
                </>
              )}
            </Button>
          </div>
        </Card>

        {items.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-gray-900 font-medium">Items ({items.length})</h3>
            {items.map((item) => (
              <Card key={item.id} className="bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                        {item.type}
                      </span>
                      <h4 className="text-gray-900 font-medium">{item.name}</h4>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    )}
                    <p className="text-sm text-gray-700">
                      KES {item.unitPrice.toLocaleString()} × {item.quantity} = KES {(item.unitPrice * item.quantity).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      aria-label="Edit item"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <TotalsCard subtotal={totals.subtotal} tax={totals.tax} total={totals.total} />
        )}

        <Button onClick={handleReview} disabled={items.length === 0}>
          Review Invoice
        </Button>
      </div>
    </Layout>
  );
}
