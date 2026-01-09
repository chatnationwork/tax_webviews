'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../../_components/Layout';
import { fetchInvoices, processBuyerInvoice, sendBuyerInvoiceAlert, sendWhatsAppMessage, sendDownloadInvoiceTemplate } from '../../../../actions/etims';
import { FetchedInvoice } from '../../../_lib/definitions';
import { getUserSession } from '../../../_lib/store';
import { Loader2, Download, ArrowLeft} from 'lucide-react';
import { QuickMenu } from '@/app/_components/QuickMenu';

function SellerViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const phone = searchParams.get('phone');
  const fromStatus = searchParams.get('status') || 'pending';
  
  const [invoice, setInvoice] = useState<FetchedInvoice | null>(null);
  const [sellerName, setSellerName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | ''>('');
  const [sendingPdf, setSendingPdf] = useState(false);

  useEffect(() => {
    // Get seller name from session
    const session = getUserSession();
    if (session?.name) {
      setSellerName(session.name);
    } else if (session?.msisdn) {
      setSellerName(`+${session.msisdn}`);
    }
    if (!id || !phone) { setIsLoading(false); setError('Missing data'); return; }
    const loadInvoice = async () => {
      try {
        // Fetch invoices where user is supplier, and verify we find the specific one
        const result = await fetchInvoices(phone, session?.name, undefined, 'supplier');
        if (result.success && result.invoices) {
          // Match against uuid, invoice_number, or legacy fields
          const found = result.invoices.find(inv => 
            inv.uuid === id || 
            inv.invoice_number === id || 
            inv.reference === id || 
            inv.invoice_id === id
          );
          if (found) setInvoice(found);
          else setError('Invoice not found');
        } else setError(result.error || 'Failed to load');
      } catch (err: any) { setError(err.message || 'Error'); }
      finally { setIsLoading(false); }
    };
    loadInvoice();
  }, [id, phone]);

  const handleSubmit = async () => {
    if (!selectedAction || !invoice || !phone || !id) return;
    setIsProcessing(true);
    try {
      const invoiceRef = invoice.invoice_number || id;
      const result = await processBuyerInvoice(phone, invoiceRef, selectedAction === 'approve' ? 'accept' : 'reject', sellerName);
      
      if (result.success) {
        // Send WhatsApp alert to buyer
        if (invoice.buyer_msisdn) {
          const statusText = selectedAction === 'approve' ? 'accepted' : 'rejected';
          const sellerDisplayName = invoice.seller_name || sellerName || 'the Seller';
          
          await sendBuyerInvoiceAlert(
            invoice.buyer_msisdn,
            invoice.buyer_name || 'Customer',
            statusText,
            sellerDisplayName
          );
        }

        // Send confirmation to seller
        if (phone) {
             const statusText = selectedAction === 'approve' ? 'accepted' : 'rejected';
             const sellerDisplayName = invoice.seller_name || sellerName || 'Partner';
             await sendWhatsAppMessage({
                 recipientPhone: phone,
                 message: `Dear ${sellerDisplayName}, you have successfully ${statusText} invoice ${invoiceRef} from ${invoice.buyer_name || 'Customer'}.`
             });
        }

        router.push(`/etims/buyer-initiated/seller/success?action=${selectedAction}&invoice=${invoiceRef}&buyer=${encodeURIComponent(invoice.buyer_name || 'Buyer')}`);
      } else {
        alert(`Failed: ${result.error || 'Unknown error'}`);
        setIsProcessing(false);
      }
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const backUrl = `/etims/buyer-initiated/seller/pending?status=${fromStatus}`;

  if (isLoading) return <Layout title="Invoice" onBack={() => router.push(backUrl)}><div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div></Layout>;
  if (error || !invoice) return <Layout title="Error" onBack={() => router.push(backUrl)}><Card className="text-center py-6"><p className="text-red-600 text-sm mb-3">{error}</p><Button onClick={() => router.push(backUrl)}>Back</Button></Card></Layout>;

  const isPending = !invoice.status || invoice.status === 'pending' || invoice.status === 'awaiting_approval';

  return (
    <Layout title="Invoice Details" showHeader={false} onBack={() => router.push(backUrl)}>
      <div className="space-y-3">
        {/* Back Button (Moved to top) */}
        <button onClick={() => router.push(backUrl)} className="text-[var(--kra-red)] text-xs font-medium flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
        </button>
        {/* Header */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Invoice Details</h1>
          <p className="text-gray-400 text-xs">{isPending ? 'Review and take action' : `Status: ${invoice.status?.toUpperCase()}`}</p>
          <p className="text-xs text-gray-500 mt-1">ID: {invoice.invoice_number || invoice.reference || invoice.invoice_id}</p>
        </div>

        {/* Buyer/Seller */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-blue-600">BUYER</p>
            <p className="text-xs font-medium truncate text-blue-800">{invoice.buyer_name || 'N/A'}</p>
          </div>
          <div className="bg-gray-100 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500">SELLER</p>
            <p className="text-xs font-medium truncate">{invoice.seller_name || sellerName || 'N/A'}</p>
          </div>
        </div>

        {/* Items Table */}
        <Card>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="text-left py-1.5 px-1 font-medium text-gray-600">Item</th>
                <th className="text-right py-1.5 px-1 font-medium text-gray-600">Price</th>
                <th className="text-center py-1.5 px-1 font-medium text-gray-600">Qty</th>
                <th className="text-right py-1.5 px-1 font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, i) => {
                const price = Number(item.unit_price) || 0;
                const qty = Number(item.quantity) || 0;
                return (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5 px-1 text-gray-800">{item.item_name}</td>
                    <td className="py-1.5 px-1 text-right text-gray-600">{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-1 text-center text-gray-600">{qty}</td>
                    <td className="py-1.5 px-1 text-right font-medium">{(price * qty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[var(--kra-black)] text-white">
              <tr>
                <td colSpan={3} className="py-2 px-1 font-medium">Total</td>
                <td className="py-2 px-1 text-right font-bold">KES {Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </Card>

        {/* Download PDF */}
        {/* Download PDF */}
        {invoice.status !== 'rejected' && (
          <button 
          onClick={
            async () => {
                      if (!invoice.invoice_pdf_url) {
                        alert('Invoice PDF not available');
                        return;
                      }
                      setSendingPdf(true);
                      try {
                        const isInvoice = invoice.status === 'accepted' || invoice.status === 'approved';
                        const docType = isInvoice ? 'Invoice Order' : 'Purchase Order';

                        const result = await sendDownloadInvoiceTemplate(
                          phone || '',
                          `${docType} *${invoice.invoice_number || invoice.reference || invoice.invoice_id}*`,
                          `${Number(invoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                          `Buyer: *${invoice.buyer_name || 'N/A'}*`,
                          invoice.invoice_pdf_url
                        );
                        if (result.success) {
                          alert(`${docType} ${invoice.invoice_number || invoice.reference || invoice.invoice_id} sent to WhatsApp number ${phone}`);
                        } else {
                          alert('Failed to send: ' + (result.error || 'Unknown error'));
                        }
                      } catch (err: any) {
                        alert('Error: ' + err.message);
                      } finally {
                        setSendingPdf(false);
                      }
                    }} 
                    disabled={sendingPdf}
                    className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 text-xs font-medium flex items-center justify-center gap-1"
                    >
            <Download className="w-3.5 h-3.5" />Download PDF
          </button>
        )}

        {/* Decision (pending only) */}
        {isPending && (
          <>
            <Card>
              <p className="text-xs text-gray-600 font-medium mb-2">Decision</p>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer ${selectedAction === 'approve' ? 'border-[var(--kra-green)] bg-green-50' : 'border-gray-200'}`}>
                  <input type="radio" name="action" value="approve" checked={selectedAction === 'approve'} onChange={() => setSelectedAction('approve')} className="sr-only" />
                  <span className={`text-sm font-medium ${selectedAction === 'approve' ? 'text-[var(--kra-green)]' : 'text-gray-600'}`}>Approve</span>
                </label>
                <label className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer ${selectedAction === 'reject' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                  <input type="radio" name="action" value="reject" checked={selectedAction === 'reject'} onChange={() => setSelectedAction('reject')} className="sr-only" />
                  <span className={`text-sm font-medium ${selectedAction === 'reject' ? 'text-red-600' : 'text-gray-600'}`}>Reject</span>
                </label>
              </div>
            </Card>

            <button onClick={handleSubmit} disabled={!selectedAction || isProcessing}
              className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                selectedAction === 'approve' ? 'bg-[var(--kra-green)] text-white' : selectedAction === 'reject' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}>
              {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : 'Submit'}
            </button>
          </>
        )}

        {!isPending && (
          <div className={`p-3 rounded-lg text-center text-sm font-medium ${invoice.status === 'approved' || invoice.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            Status: {invoice.status?.toUpperCase()}
          </div>
        )}


        {/* Quick Menu */}
        <div className="pt-2">
          <p className="text-xs text-gray-500 mb-2 text-center">Quick Actions</p>
          <QuickMenu />
        </div>
      </div>
    </Layout>
  );
}

export default function SellerView() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">Loading...</div>}><SellerViewContent /></Suspense>;
}
