'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button, IdentityStrip } from '../../_components/Layout';
import { getSalesInvoice, Invoice, getUserSession } from '../../_lib/store';
import { submitInvoice } from '../../../actions/etims';
import { Loader2 } from 'lucide-react';

export default function SalesInvoiceReview() {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Partial<Invoice> | null>(null);
  const [sellerName, setSellerName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    const saved = getSalesInvoice();
    if (!saved || !saved.items || saved.items.length === 0) {
      router.push('/etims/sales-invoice/details');
      return;
    }
    setInvoice(saved);
    
    // Get seller info from session
    const session = getUserSession();
    if (session?.name) {
      setSellerName(session.name);
    } else if (session?.msisdn) {
      // Format phone as fallback
      setSellerName(`+${session.msisdn}`);
    }
  }, [router]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const session = getUserSession();
      if (!session?.msisdn) {
        setError('Session expired. Please go back to home page and try again.');
        return;
      }
  
      if (!invoice || !invoice.items) {
        setError('Invoice data is missing. Please go back and add items.');
        return;
      }

      // Calculate total if not present
      const calculatedTotal = invoice.total || invoice.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  
      const result = await submitInvoice({
        msisdn: session.msisdn,
        total_amount: calculatedTotal,
        items: invoice.items.map(item => ({
          item_name: item.name,
          taxable_amount: item.unitPrice,
          quantity: item.quantity
        }))
      });
  
      if (result.success) {
        router.push('/etims/sales-invoice/success');
      } else {
        // Show friendly error message
        setError('Could not submit invoice. Please check your details and try again.');
      }
    } catch (err: any) {
      // Show friendly error message
      setError('Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !invoice) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout 
      title="Review Invoice" 
      step="Step 3 of 3"
      onBack={() => router.push('/etims/sales-invoice/details')}
    >
      <div className="space-y-3">
        {/* Seller Info */}
        {sellerName && (
          <IdentityStrip 
            label="Seller"
            value={sellerName}
          />
        )}

        {/* Buyer Info */}
        {invoice.buyer && (
          <IdentityStrip 
            label="Buyer"
            value={`${invoice.buyer.name} (${invoice.buyer.pin})`}
          />
        )}

        {/* Items Summary - Table Format */}
        <Card>
          <h3 className="text-sm text-gray-900 font-medium mb-3">
            Products/Services ({invoice.items?.length || 0})
          </h3>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">Name</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-medium">Price</th>
                  <th className="text-center py-2 text-xs text-gray-500 font-medium">Qty</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2.5">
                      <span className="text-gray-900 font-medium">{item.name}</span>
                    </td>
                    <td className="text-right py-2.5 text-gray-700 whitespace-nowrap">
                      {item.unitPrice.toLocaleString()}
                    </td>
                    <td className="text-center py-2.5 text-gray-700">
                      {item.quantity}
                    </td>
                    <td className="text-right py-2.5 text-gray-900 font-medium whitespace-nowrap">
                      {(item.unitPrice * item.quantity).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[var(--kra-black)] text-white">
                <tr>
                  <td colSpan={2} className="py-2.5 px-1 font-medium">Total</td>
                  <td colSpan={2} className="py-2.5 px-1 text-right font-bold">KES {invoice.total?.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        )}

        {/* Actions */}
        {isSubmitting ? (
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <p className="text-blue-900 font-medium">Submitting Invoice...</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            <Button onClick={handleSubmit}>
              Submit
            </Button>
            <Button variant="secondary" onClick={() => router.push('/etims/sales-invoice/details')}>
              Edit Details
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
