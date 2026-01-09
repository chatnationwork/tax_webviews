'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../../_components/Layout';
import { fetchInvoices, sendDownloadInvoiceTemplate } from '../../../../actions/etims';
import { FetchedInvoice } from '../../../_lib/definitions';
import { Download, Eye, Loader2, Phone, FileText, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
        setCurrentPage(1); // Reset to first page on fetch
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
    // Use uuid as primary identifier, fallback to invoice_number
    const invoiceId = invoice.uuid || invoice.invoice_number || invoice.invoice_id || invoice.reference;
    router.push(`/etims/buyer-initiated/buyer/view?id=${invoiceId}&phone=${encodeURIComponent(phoneNumber)}&status=${statusFilter}`);
  };

  const handleDownloadInvoice = async (invoice: FetchedInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!invoice.invoice_pdf_url) {
      alert('Invoice PDF not available');
      return;
    }
    
    const invoiceId = invoice.uuid || invoice.invoice_number || invoice.invoice_id || invoice.reference || '';
    setSendingPdf(invoiceId);
    
    try {
      const isInvoice = invoice.status === 'accepted' || invoice.status === 'approved';
      const docType = isInvoice ? 'Invoice Order' : 'Purchase Order';

      const result = await sendDownloadInvoiceTemplate(
        phoneNumber,
        `${docType} *${invoice.invoice_number || invoice.reference || invoice.invoice_id}*`,
        `${Number(invoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `Seller: *${invoice.seller_name || 'N/A'}*`,
        invoice.invoice_pdf_url
      );
      
      if (result.success) {
        alert(`${docType} ${invoice.invoice_number || invoice.reference || invoice.invoice_id} sent to WhatsApp number ${phoneNumber}`);
      } else {
        alert('Failed to send: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error sending PDF: ' + err.message);
    } finally {
      setSendingPdf(null);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = invoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (initializing) return <Layout title={getPageTitle()} onBack={() => router.push('/etims/buyer-initiated')}><div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div></Layout>;

  return (
    <Layout title={`${getPageTitle()} Invoices`} onBack={() => router.push('/etims/buyer-initiated')}>
      <div className="space-y-3">
        {/* Helper Back Button */}
        <button onClick={() => router.push('/etims/buyer-initiated')} className="text-[var(--kra-red)] text-xs font-medium flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

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
                      <th className="text-center py-1.5 px-1 font-medium text-gray-600">{statusFilter === 'rejected' ? 'View' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInvoices.map((invoice, idx) => {
                      const invoiceId = invoice.uuid || invoice.invoice_number || invoice.invoice_id || invoice.reference || String((currentPage - 1) * ITEMS_PER_PAGE + idx);
                      return (
                        <tr key={invoiceId} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 px-1">
                            <span className="font-medium text-gray-800">{invoice.invoice_number || invoice.reference || 'N/A'}</span>
                            <span className="block text-[10px] text-gray-400">{invoice.seller_name || 'Unknown Seller'}</span>
                          </td>
                          <td className="py-2 px-1 text-right font-medium">{Number(invoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-1">
                            <div className="flex items-center justify-center gap-1">
                              {statusFilter !== 'rejected' && (
                              <button 
                                onClick={(e) => handleDownloadInvoice(invoice, e)}
                                disabled={sendingPdf === invoiceId}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded text-blue-600 disabled:opacity-50"
                                title="Download Invoice"
                              >
                                {sendingPdf === invoiceId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                              </button>
                              )}
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
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                       <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
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
