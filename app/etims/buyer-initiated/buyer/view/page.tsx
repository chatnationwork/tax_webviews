'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button, TotalsCard, IdentityStrip } from '../../../_components/Layout';
import { calculateTotals } from '../../../_lib/store'; // Keep calculateTotals or implement locally
import { fetchInvoices, processBuyerInvoice } from '../../../../actions/etims';
import { FetchedInvoice } from '../../../_lib/definitions';
import { Loader2 } from 'lucide-react';

function BuyerViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const phone = searchParams.get('phone');
  
  const [invoice, setInvoice] = useState<FetchedInvoice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !phone) {
        setIsLoading(false);
        if (!phone) setError('Phone number missing');
        else setError('Invoice ID missing');
        return;
    }

    const loadInvoice = async () => {
        try {
            // Since we don't have getInvoiceById, we fetch all and find
            const result = await fetchInvoices(phone);
            if (result.success && result.invoices) {
                const found = result.invoices.find(inv => 
                    inv.reference === id || inv.invoice_id === id || 
                    (inv as any).invoiceRef === id // Handle potential inconsistencies
                );
                
                if (found) {
                    setInvoice(found);
                } else {
                    setError('Invoice not found');
                }
            } else {
                setError(result.error || 'Failed to fetch invoices');
            }
        } catch (err: any) {
            setError(err.message || 'Error loading invoice');
        } finally {
            setIsLoading(false);
        }
    };

    loadInvoice();
  }, [id, phone]);

  const handleProcess = async (action: 'accept' | 'reject') => {
    if (!invoice || !phone || !id) return;
    setIsProcessing(true);
    
    try {
        await processBuyerInvoice(phone, id, action); // Use ID or reference? Using id from param which matched
        router.push(`/etims/buyer-initiated/buyer/success?action=${action}`);
    } catch (err: any) {
        alert(`Failed to ${action} invoice: ${err.message}`);
        setIsProcessing(false);
    }
  };

  const handleAccept = () => handleProcess('accept');
  
  // For reject, maybe we want to go to a reject page for reason?
  // Current implementation went to /reject page.
  // If API supports simple reject, we can do it here. If it needs reason, we go to reject page.
  // The processBuyerInvoice in actions/etims.ts just sends action='reject'.
  // Postman doesn't show reason in body for accept/reject action.
  // So I'll implement it directly here for now.
  const handleReject = () => handleProcess('reject');

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (error || !invoice) {
    return (
        <Layout title="Error" onBack={() => router.back()}>
            <Card className="p-8 text-center">
                <p className="text-red-600">{error || 'Invoice not found'}</p>
                <Button className="mt-4" onClick={() => router.back()}>Go Back</Button>
            </Card>
        </Layout>
    );
  }

  // Calculate totals
  const subtotal = invoice.total_amount; // API returns subtotal? No, usually total_amount.
  // If API returns items, we can calc.
  // FetchedInvoice has items: { quantity, unit_price }
  let calculatedSubtotal = 0;
  if (invoice.items) {
      calculatedSubtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  }
  const tax = calculatedSubtotal * 0.16; // Estimate tax? Or assume total_amount includes tax?
  // The API result `total_amount` is likely the final amount.
  // I'll display total_amount. Breaking down tax might be inaccurate if I don't know tax status.
  // But TotalsCard expects subtotal, tax, total.
  // I'll use invoice.total_amount as total. Calculate tax backwards or just 0 if unknown.

  return (
    <Layout 
      title="View Invoice" 
      onBack={() => router.push('/etims/buyer-initiated/buyer/pending')}
    >
      <div className="space-y-4">
        <IdentityStrip 
          label="Seller"
          value={invoice.seller_name || 'Unknown Seller'}
        />

        <Card>
          <h3 className="text-gray-900 font-medium mb-3">Invoice Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Ref:</span>
              <span className="text-gray-900 font-medium">{invoice.reference || invoice.invoice_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="text-gray-900">{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="px-2 py-0.5 text-xs rounded bg-orange-100 text-orange-700 font-medium">
                {invoice.status || 'Pending'}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-gray-900 font-medium mb-3">Items ({invoice.items ? invoice.items.length : 0})</h3>
          <div className="space-y-3">
            {invoice.items && invoice.items.map((item, i) => (
              <div key={i} className="pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-gray-900 font-medium">{item.item_name}</h4>
                </div>
                <p className="text-sm text-gray-700">
                  KES {item.unit_price.toLocaleString()} × {item.quantity} = KES {(item.unit_price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <TotalsCard 
          subtotal={calculatedSubtotal || invoice.total_amount} 
          tax={0} 
          total={invoice.total_amount} 
        />

        {isProcessing ? (
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <p className="text-blue-900 font-medium">Processing...</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            <Button onClick={handleAccept}>
              Accept Invoice
            </Button>
            <Button variant="danger" onClick={handleReject}>
              Reject Invoice
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function BuyerInitiatedBuyerView() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <BuyerViewContent />
    </Suspense>
  );
}
