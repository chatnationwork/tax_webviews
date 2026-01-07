'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../../_components/Layout';
import { fetchInvoices, sendDownloadInvoiceTemplate } from '../../../../actions/etims';
import { FetchedInvoice } from '../../../_lib/definitions';
import { getUserSession } from '../../../_lib/store';
import { Loader2, Download, ArrowLeft } from 'lucide-react';
import { QuickMenu } from '@/app/_components/QuickMenu';

function BuyerViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const phone = searchParams.get('phone');
  const fromStatus = searchParams.get('status') || 'pending';
  
  const [invoice, setInvoice] = useState<FetchedInvoice | null>(null);
  const [buyerName, setBuyerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingPdf, setSendingPdf] = useState(false);

  useEffect(() => {
    // Get buyer name from session
    const session = getUserSession();
    if (session?.name) {
      setBuyerName(session.name);
    } else if (session?.msisdn) {
      setBuyerName(`+${session.msisdn}`);
    }
    if (!id || !phone) { setIsLoading(false); setError('Missing data'); return; }
    const loadInvoice = async () => {
      try {
        const result = await fetchInvoices(phone, session?.name, undefined, 'buyer');
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

  const getStatusColor = (status?: string) => {
    if (!status || status === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (status === 'approved' || status === 'accepted') return 'bg-green-100 text-green-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const backUrl = `/etims/buyer-initiated/buyer/invoices?status=${fromStatus}`;

  if (isLoading) return <Layout title="Invoice" onBack={() => router.push(backUrl)}><div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div></Layout>;
  if (error || !invoice) return <Layout title="Error" onBack={() => router.push(backUrl)}><Card className="text-center py-6"><p className="text-red-600 text-sm mb-3">{error}</p><Button onClick={() => router.push(backUrl)}>Back</Button></Card></Layout>;

  const isPending = !invoice.status || invoice.status === 'pending';

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
          <p className="text-gray-400 text-xs">{isPending ? 'Awaiting seller approval' : `Status: ${invoice.status?.toUpperCase()}`}</p>
          <p className="text-xs text-gray-500 mt-1">ID: {invoice.invoice_number || invoice.reference || invoice.invoice_id}</p>
        </div>

        {/* Buyer/Seller */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-100 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500">BUYER</p>
            <p className="text-[10px] font-medium truncate">{invoice.buyer_name || buyerName || 'N/A'}</p>
          </div>
          <div className="bg-blue-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-blue-600">SELLER</p>
            <p className="text-[10px] font-medium truncate text-blue-800">{invoice.seller_name || 'N/A'}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`p-2 rounded-lg text-center text-xs font-medium ${getStatusColor(invoice.status)}`}>
          Status: {invoice.status?.toUpperCase() || 'PENDING'}
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
            onClick={async () => {
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
                    `Seller: *${invoice.seller_name || 'N/A'}*`,
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
            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {sendingPdf ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending...</> : <><Download className="w-3.5 h-3.5" />Send PDF to WhatsApp</>}
          </button>
        )}

        {/* Back to Invoices */}

        {/* Quick Menu */}
        <div className="pt-2">
          <p className="text-xs text-gray-500 mb-2 text-center">Quick Actions</p>
          <QuickMenu />
        </div>
      </div>
    </Layout>
  );
}

export default function BuyerView() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">Loading...</div>}><BuyerViewContent /></Suspense>;
}
