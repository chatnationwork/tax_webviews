'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../_components/Layout';
import { getSalesInvoice, Invoice, getUserSession } from '../../_lib/store';
import { submitInvoice, sendInvoiceCreditDocTemplate } from '../../../actions/etims';
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
    console.log(session);
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
        customer_pin: invoice.buyer?.pin,
        pin: invoice.buyer?.pin,
        customer_name: invoice.buyer?.name,
        customer_phone: invoice.buyer?.msisdn,
        total_amount: calculatedTotal,
        items: invoice.items.map(item => ({
          item_name: item.name,
          taxable_amount: item.unitPrice,
          quantity: item.quantity,
          total_amount: item.unitPrice * item.quantity
        }))
      });
  
      if (result.success) {
        // Send invoice PDF to user via WhatsApp

//         Dear [Full Name],
 
// Your Sales Invoice KRASRN000006245/464 for KES 39,000 was issued on 17 Dec 2025. 

// The Sales Invoice  PDF is attached for your records.
        if (result.invoice_pdf_url && session.msisdn) {
          const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          await sendInvoiceCreditDocTemplate(
            session.msisdn,
            session.name || 'Valued Customer',
            `sales invoice *${result.invoice_id}*`,
            calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            today,
            result.invoice_pdf_url
          );
        }
        router.push(`/etims/sales-invoice/success?invoice=${encodeURIComponent(result.invoice_id || '')}`);
      } else {
        // Show friendly error message
        setError(result.error || 'Could not submit invoice. Please check your details and try again.');
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
        {/* Items Summary with Seller/Buyer Info */}
        <Card>
          {/* Seller/Buyer Row */}
          <div className="grid grid-cols-2 gap-2 mb-3 pb-2 border-b border-gray-200">
            <div className="bg-gray-50 rounded px-2 py-1.5">
              <p className="text-[10px] text-gray-500 uppercase">Seller</p>
              <p className="text-[10px] font-medium text-gray-800 truncate">{sellerName || 'N/A'}</p>
            </div>
            {invoice.buyer && (
              <div className="bg-blue-50 rounded px-2 py-1.5">
                <p className="text-[10px] text-blue-600 uppercase">Buyer</p>
                <p className="text-[10px] font-medium text-blue-800 truncate">{invoice.buyer.name || invoice.buyer.pin}</p>
              </div>
            )}
          </div>

          {/* Items Table Header */}
          <h3 className="text-sm text-gray-900 font-medium mb-2">
            Items ({invoice.items?.length || 0})
          </h3>
          <div className="overflow-x-auto -mx-3 px-3">
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
                    <td className="py-2">
                      <span className="text-gray-900 font-medium text-xs">{item.name}</span>
                    </td>
                    <td className="text-right py-2 text-xs text-gray-700 whitespace-nowrap">
                      {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-center py-2 text-xs text-gray-700">
                      {item.quantity}
                    </td>
                    <td className="text-right py-2 text-xs text-gray-900 font-medium whitespace-nowrap">
                      {(item.unitPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[var(--kra-black)] text-white">
                <tr>
                  <td colSpan={2} className="py-2 px-1 font-medium text-sm">Total</td>
                  <td colSpan={2} className="py-2 px-1 text-right font-bold text-sm">KES {invoice.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
