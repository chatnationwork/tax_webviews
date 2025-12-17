'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { submitBuyerInitiatedInvoice, sendWhatsAppDocument } from '../../../../actions/etims';
import { getBuyerInitiated, BuyerInitiatedInvoice, calculateTotals, getUserSession } from '../../../_lib/store';
import { Loader2, Edit2, Send, Store } from 'lucide-react';

export default function BuyerInitiatedReview() {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Partial<BuyerInitiatedInvoice> | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    const saved = getBuyerInitiated();
    if (!saved || !saved.items || saved.items.length === 0 || !saved.sellerName) {
      router.push('/etims/buyer-initiated/buyer/details');
      return;
    }
    setInvoice(saved);
  }, [router]);

  const handleSubmit = async () => {
    setIsSending(true);
    setError('');
    try {
      const session = getUserSession();
      if (!session?.msisdn) { setError('Session not found'); setIsSending(false); return; }
      if (!invoice || !invoice.items || !invoice.sellerPin) { setError('Invalid data'); setIsSending(false); return; }

      const totals = calculateTotals(invoice.items);
      const result = await submitBuyerInitiatedInvoice({
        msisdn: session.msisdn,
        seller_pin: invoice.sellerPin,
        seller_msisdn: invoice.sellerPhone || '',
        total_amount: totals.total,
        items: invoice.items.map(item => ({ item_name: item.name, taxable_amount: item.unitPrice, quantity: item.quantity }))
      });

      if (result.success) {
        // Send invoice PDF to user via WhatsApp

//         Dear [Full Name],
 
// Your Sales Invoice KRASRN000006245/464 for KES 39,000 was issued on 17 Dec 2025. 

// The Sales Invoice  PDF is attached for your records.
        if (result.invoice_pdf_url && session.msisdn) {
          const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          await sendWhatsAppDocument({
            recipientPhone: session.msisdn,
            documentUrl: result.invoice_pdf_url,
            caption: `Dear ${session.name || 'Valued Customer'},\n\nYour buyer-initiated invoice (${result.reference || result.invoice_id}) of KES ${totals.total.toLocaleString()} to ${invoice.sellerName} has been successfully submitted on ${today}.\n\nPlease find the attached invoice document for your records.\n\nThank you for using KRA eTIMS services.`,
            filename: `eTIMS_Buyer_Invoice_${result.reference || today}.pdf`
          });
        }
        router.push('/etims/buyer-initiated/buyer/success');
      }
      else setError(result.error || 'Submission failed');
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setIsSending(false);
    }
  };

  if (!mounted || !invoice) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">Loading...</div>;

  const totals = calculateTotals(invoice.items || []);

  return (
    <Layout title="Invoice Preview" showHeader={false} onBack={() => router.push('/etims/buyer-initiated/buyer/details')}>
      <div className="space-y-3">
        {/* Header */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Invoice Preview</h1>
          <p className="text-gray-400 text-xs">Step 4/4 - Final review</p>
        </div>

        {/* Seller */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
          <Store className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-[10px] text-gray-500">SELLER</p>
            <p className="text-sm font-medium text-gray-800">{invoice.sellerName}</p>
          </div>
        </div>

        {/* Items Table */}
        <Card>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="text-left py-1.5 px-1 font-medium text-gray-600">Product</th>
                <th className="text-center py-1.5 px-1 font-medium text-gray-600">Qty   Price</th>
                <th className="text-right py-1.5 px-1 font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-1.5 px-1 text-gray-800">{item.name}</td>
                  <td className="py-1.5 px-1 text-center text-gray-600">{item.quantity}   {item.unitPrice.toLocaleString()}</td>
                  <td className="py-1.5 px-1 text-right font-medium">{(item.unitPrice * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[var(--kra-black)] text-white">
              <tr>
                <td colSpan={2} className="py-2 px-1 font-medium">Total Amount</td>
                <td className="py-2 px-1 text-right font-bold">KES {totals.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </Card>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {isSending ? (
          <Card className="bg-gray-100">
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
              <span className="text-sm text-gray-700">Sending...</span>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            <button onClick={handleSubmit}
              className="w-full py-2.5 bg-[var(--kra-green)] hover:bg-[var(--kra-green-dark)] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />Submit
            </button>
            <button onClick={() => router.push('/etims/buyer-initiated/buyer/details')}
              className="w-full py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-center gap-1">
              <Edit2 className="w-4 h-4" />Edit
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
