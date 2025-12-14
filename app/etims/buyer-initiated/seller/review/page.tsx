'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button, TotalsCard, IdentityStrip } from '../../../_components/Layout';
import { getBuyerInitiated, BuyerInitiatedInvoice, calculateTotals } from '../../../_lib/store';
import { Loader2 } from 'lucide-react';

export default function BuyerInitiatedSellerReview() {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Partial<BuyerInitiatedInvoice> | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = getBuyerInitiated();
    if (!saved || !saved.items || saved.items.length === 0 || !saved.buyerName) {
      router.push('/etims/buyer-initiated/seller/details');
      return;
    }
    setInvoice(saved);
  }, [router]);

  const handleSend = async () => {
    setIsSending(true);
    
    // Simulate sending to buyer
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    router.push('/etims/buyer-initiated/seller/success');
  };

  if (!mounted || !invoice) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  const totals = calculateTotals(invoice.items || []);

  return (
    <Layout 
      title="Review & Send" 
      step="Step 3 of 3"
      onBack={() => router.push('/etims/buyer-initiated/seller/details')}
    >
      <div className="space-y-4">
        <IdentityStrip 
          label="Buyer"
          value={invoice.buyerName || ''}
        />

        <Card>
          <h3 className="text-gray-900 font-medium mb-3">Items ({invoice.items?.length || 0})</h3>
          <div className="space-y-3">
            {invoice.items?.map((item) => (
              <div key={item.id} className="pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                        {item.type}
                      </span>
                      <h4 className="text-gray-900 font-medium">{item.name}</h4>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700">
                  KES {item.unitPrice.toLocaleString()} × {item.quantity} = KES {(item.unitPrice * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <TotalsCard 
          subtotal={totals.subtotal} 
          tax={totals.tax} 
          total={totals.total} 
        />

        {isSending ? (
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <p className="text-blue-900 font-medium">Sending to Buyer...</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            <Button onClick={handleSend}>
              Send to Buyer
            </Button>
            <Button variant="secondary" onClick={() => router.push('/etims/buyer-initiated/seller/details')}>
              Edit Details
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
