'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card } from '../../../../_components/Layout';
import { submitBuyerInitiatedInvoice, sendBuyerInitiatedInvoiceAlert, sendWhatsAppMessage } from '../../../../actions/etims';
import { saveBuyerInitiated, getBuyerInitiated, BuyerInitiatedInvoice, calculateTotals, getUserSession } from '../../../_lib/store';
import { Loader2, Edit2, Send, Store, Check, X } from 'lucide-react';

export default function BuyerInitiatedReview() {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Partial<BuyerInitiatedInvoice> | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [isEditingSeller, setIsEditingSeller] = useState(false);
  const [editSellerName, setEditSellerName] = useState('');

  useEffect(() => {
    setMounted(true);
    const saved = getBuyerInitiated();
    if (!saved || !saved.items || saved.items.length === 0 || !saved.sellerName) {
      router.push('/etims/buyer-initiated/buyer/details');
      return;
    }
    setInvoice(saved);
    setEditSellerName(saved.sellerName || '');
  }, [router]);

  const handleSaveSellerName = () => {
    if (!editSellerName.trim() || !invoice) return;
    const updated = { ...invoice, sellerName: editSellerName.trim() };
    setInvoice(updated);
    saveBuyerInitiated({ sellerName: editSellerName.trim() });
    setIsEditingSeller(false);
  };

  const handleSubmit = async () => {
    setIsSending(true);
    setError('');
    try {
      const session = getUserSession();
      if (!session?.msisdn) { setError('Session not found'); setIsSending(false); return; }
      if (!invoice) { setError('Invoice not found'); setIsSending(false); return; }
      if (!invoice.items) { setError('Items not found'); setIsSending(false); return; }
      if (!invoice.sellerPin) { setError('Seller pin not found'); setIsSending(false); return; }
      if (!invoice.sellerName) { setError('Seller name not found'); setIsSending(false); return; }
     

      const totals = calculateTotals(invoice.items);
      const result = await submitBuyerInitiatedInvoice({
        msisdn: session.msisdn,
        seller_pin: invoice.sellerPin,
        seller_msisdn: invoice.sellerPhone || '',
        total_amount: totals.total,
        seller_name: invoice.sellerName,
        items: invoice.items.map(item => ({ item_name: item.name, taxable_amount: item.unitPrice, quantity: item.quantity, total_amount: item.unitPrice * item.quantity }))
      });

      if (result.success) {
        // Send invoice PDF to user via WhatsApp

//         Dear [Full Name],
 
// Your Sales Invoice KRASRN000006245/464 for KES 39,000 was issued on 17 Dec 2025. 

// The Sales Invoice  PDF is attached for your records.
        // if (result.invoice_pdf_url && session.msisdn) {
        //   const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        //   await sendWhatsAppDocument({
        //     recipientPhone: session.msisdn,
        //     documentUrl: result.invoice_pdf_url,
        //     caption: `Dear *${session.name || 'Valued Customer'}*,\n\nYour buyer-initiated invoice *${result.invoice_number || result.reference || result.invoice_id}* of KES *${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}* to *${invoice.sellerName}* has been successfully submitted on *${today}*\n\nPlease find the attached invoice document for your records.\n\nThank you for using KRA eTIMS services.`,
        //     filename: `eTIMS_Buyer_Invoice_${result.invoice_number || result.reference || today}.pdf`
        //   });
        // }

//         Dear[Buyer Name]
// [Seller Name] You have created a buyer initiated invoice of  KES [Amount] on [Date] for [Seller Name]. 

        if (session.msisdn) {
          const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          await sendWhatsAppMessage(
            {
              recipientPhone: session.msisdn,
              message: `Dear *${session.name || 'Valued Customer'}*,\n\nYou have created a buyer initiated invoice of KES *${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}* on *${today}* for *${invoice.sellerName}*.`
            }
          )
        }
        
        // Send notification to seller
        if (invoice.sellerPhone) {
          await sendBuyerInitiatedInvoiceAlert(
            invoice.sellerPhone,
            invoice.sellerName,
            session.name || 'Valued Customer',
            `KES ${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            result.invoice_number || result.reference || result.invoice_id || 'N/A'
          );
        }

        router.push(`/etims/buyer-initiated/buyer/success?invoice=${result.invoice_number || result.reference || result.invoice_id || ''}&seller=${encodeURIComponent(invoice.sellerName)}`);
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
        {/* Seller */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-[10px] text-gray-500">SELLER</p>
              {isEditingSeller ? (
                <input 
                  autoFocus
                  className="text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded px-1.5 py-0.5 mt-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                  value={editSellerName}
                  onChange={(e) => setEditSellerName(e.target.value)}
                />
              ) : (
                <p className="text-sm font-medium text-gray-800">{invoice.sellerName}</p>
              )}
            </div>
          </div>
          
          {isEditingSeller ? (
            <div className="flex items-center gap-1">
              <button onClick={handleSaveSellerName} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setIsEditingSeller(false); setEditSellerName(invoice.sellerName || ''); }} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditingSeller(true)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Items Table */}
        <Card>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="text-left py-1.5 px-1 font-medium text-gray-600">Product</th>
                <th className="text-center py-1.5 px-1 font-medium text-gray-600">Qty</th>
                <th className="text-center py-1.5 px-1 font-medium text-gray-600">Price</th>
                <th className="text-right py-1.5 px-1 font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-1.5 px-1 text-gray-800">{item.name}</td>
                  <td className="py-1.5 px-1 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-1.5 px-1 text-center text-gray-600">{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-1 text-right font-medium">{(item.unitPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[var(--kra-black)] text-white">
              <tr>
                <td colSpan={3} className="py-2 px-1 font-medium">Total Amount</td>
                <td className="py-2 px-1 text-right font-bold">KES {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
