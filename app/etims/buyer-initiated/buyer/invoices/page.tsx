'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { fetchInvoices, sendWhatsAppDocument } from '../../../../actions/etims';
import { FetchedInvoice } from '../../../_lib/definitions';
import { Download, Eye, Loader2, Phone, FileText } from 'lucide-react';
import { getUserSession } from '../../../_lib/store';

function BuyerInvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || 'pending';
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [isPhoneSet, setIsPhoneSet] = useState(false);
  const [invoices, setInvoices] = useState<FetchedInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');
  const [sendingPdf, setSendingPdf] = useState<string | null>(null); // Track which invoice is sending

  const getPageTitle = () => {
    switch (statusFilter) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return 'Pending';
    }
  };

  useEffect(() => {
    const session = getUserSession();
    if (session?.msisdn) {
      setPhoneNumber(session.msisdn);
      setUserName(session.name || '');
      setIsPhoneSet(true);
      fetchInvoicesData(session.msisdn, session.name);
    }
    setInitializing(false);
  }, [statusFilter]);

  const fetchInvoicesData = async (phone: string, name?: string) => {
    if (!phone.trim()) return;
    setLoading(true);
    setError('');
    try {
      // Map status for API: 'pending' -> 'awaiting_approval', 'approved' -> 'accepted'
      let apiStatus: 'pending' | 'rejected' | 'accepted' | 'awaiting_approval' = 'awaiting_approval';
      if (statusFilter === 'approved') apiStatus = 'accepted';
      else if (statusFilter === 'rejected') apiStatus = 'rejected';
      else if (statusFilter === 'pending') apiStatus = 'awaiting_approval';
      
      // Pass actor='buyer' to get invoices where user is the buyer
      const result = await fetchInvoices(phone, name || userName, apiStatus, 'buyer');
      if (result.success && result.invoices) {
        setInvoices(result.invoices);
      } else {
        setError(result.error || 'No invoices found');
        if (result.success) setInvoices([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchInvoices = () => { if (phoneNumber) { setIsPhoneSet(true); fetchInvoicesData(phoneNumber); }};
  
  const handleViewInvoice = (invoice: FetchedInvoice) => {
    const invoiceId = invoice.invoice_id || invoice.reference;
    router.push(`/etims/buyer-initiated/buyer/view?id=${invoiceId}&phone=${encodeURIComponent(phoneNumber)}&status=${statusFilter}`);
  };

  const handleDownloadInvoice = async (invoice: FetchedInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!invoice.invoice_pdf_url) {
      alert('Invoice PDF not available');
      return;
    }
    
    const invoiceId = invoice.invoice_id || invoice.reference || '';
    setSendingPdf(invoiceId);
    
    try {
      const result = await sendWhatsAppDocument({
        recipientPhone: phoneNumber,
        documentUrl: invoice.invoice_pdf_url,
        caption: `Invoice ${invoice.reference || invoice.invoice_id}\nAmount: KES ${(invoice.total_amount || 0).toLocaleString()}\nSeller: ${invoice.seller_name || 'N/A'}`,
        filename: `Invoice_${invoice.reference || invoice.invoice_id || 'document'}.pdf`
      });
      
      if (result.success) {
        alert('Invoice PDF sent to your WhatsApp!');
      } else {
        alert('Failed to send: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error sending PDF: ' + err.message);
    } finally {
      setSendingPdf(null);
    }
  };

  if (initializing) return <Layout title={getPageTitle()} onBack={() => router.push('/etims/buyer-initiated')}><div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div></Layout>;

  return (
    <Layout title={`${getPageTitle()} Invoices`} onBack={() => router.push('/etims/buyer-initiated')}>
      <div className="space-y-3">
        {!isPhoneSet ? (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Enter Phone Number</span>
            </div>
            <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0712345678"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mb-2" />
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <Button onClick={handleFetchInvoices} disabled={!phoneNumber.trim() || loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Checking...</> : 'View Invoices'}
            </Button>
          </Card>
        ) : (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : invoices.length === 0 ? (
              <Card className="text-center py-6">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No {statusFilter} invoices</p>
              </Card>
            ) : (
              <Card>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="border-b">
                      <th className="text-left py-1.5 px-1 font-medium text-gray-600">Invoice</th>
                      <th className="text-right py-1.5 px-1 font-medium text-gray-600">Amount</th>
                      <th className="text-center py-1.5 px-1 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice, idx) => {
                      const invoiceId = invoice.invoice_id || invoice.reference || String(idx);
                      return (
                        <tr key={invoiceId} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 px-1">
                            <span className="font-medium text-gray-800">{invoice.reference || invoice.invoice_id || 'N/A'}</span>
                            <span className="block text-[10px] text-gray-400">{invoice.seller_name || 'Unknown Seller'}</span>
                          </td>
                          <td className="py-2 px-1 text-right font-medium">{(invoice.total_amount || 0).toLocaleString()}</td>
                          <td className="py-2 px-1">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={(e) => handleDownloadInvoice(invoice, e)}
                                disabled={sendingPdf === invoiceId}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded text-blue-600 disabled:opacity-50"
                                title="Send to WhatsApp"
                              >
                                {sendingPdf === invoiceId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                              </button>
                              <button 
                                onClick={() => handleViewInvoice(invoice)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default function BuyerInvoices() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">Loading...</div>}><BuyerInvoicesContent /></Suspense>;
}
