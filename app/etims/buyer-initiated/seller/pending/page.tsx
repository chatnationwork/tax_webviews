'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { fetchInvoices, processBuyerInvoiceBulk, sendWhatsAppDocument } from '../../../../actions/etims';
import { FetchedInvoice } from '../../../_lib/definitions';
import { Download, Eye, Loader2, Phone, FileText, Square, CheckSquare, ArrowLeft } from 'lucide-react';
import { getUserSession } from '../../../_lib/store';

function SellerPendingContent() {
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
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [confirmingBulkAction, setConfirmingBulkAction] = useState<'accept' | 'reject' | null>(null);
  const [sendingPdf, setSendingPdf] = useState<string | null>(null);

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
  }, [statusFilter]); // Re-fetch when status changes

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
      
      // Pass actor='supplier' to get invoices where user is the seller
      const result = await fetchInvoices(phone, name || userName, apiStatus, 'supplier');
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
    const invoiceId = invoice.uuid || invoice.invoice_number || invoice.invoice_id || invoice.reference;
    router.push(`/etims/buyer-initiated/seller/view?id=${invoiceId}&phone=${encodeURIComponent(phoneNumber)}&status=${statusFilter}`);
  };

  const handleDownloadInvoice = async (invoice: FetchedInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!invoice.invoice_pdf_url) {
      alert('Download URL not available for this invoice.');
      return;
    }

    const startId = invoice.uuid || invoice.invoice_number || invoice.invoice_id || invoice.reference || '';
    setSendingPdf(startId);

    try {
      const isInvoice = invoice.status === 'accepted' || invoice.status === 'approved';
      const docType = isInvoice ? 'Invoice Order' : 'Purchase Order';

      const result = await sendWhatsAppDocument({
        recipientPhone: phoneNumber,
        documentUrl: invoice.invoice_pdf_url,
        caption: `${docType} *${invoice.invoice_number || invoice.reference || invoice.invoice_id}*\nAmount: KES *${Number(invoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\nBuyer: *${invoice.buyer_name || 'N/A'}*`,
        filename: `${docType.replace(' ', '_')}_${invoice.invoice_number || invoice.reference || invoice.invoice_id || 'document'}.pdf`
      });

      if (result.success) {
        alert(`${docType} ${invoice.invoice_number || invoice.reference || invoice.invoice_id} sent to WhatsApp number ${phoneNumber}`);
      } else {
        alert('Failed to send: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error sending invoice: ' + err.message);
    } finally {
      setSendingPdf(null);
    }
  };

  const toggleInvoiceSelection = (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedInvoices);
    newSelected.has(invoiceId) ? newSelected.delete(invoiceId) : newSelected.add(invoiceId);
    setSelectedInvoices(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.size === invoices.length) {
      // All selected, so deselect all
      setSelectedInvoices(new Set());
    } else {
      // Select all
      const allIds = invoices.map((inv, idx) => inv.uuid || inv.invoice_number || inv.invoice_id || inv.reference || String(idx));
      setSelectedInvoices(new Set(allIds));
    }
  };

  const initiateBulkAction = (action: 'accept' | 'reject') => {
    if (!phoneNumber || selectedInvoices.size === 0) return;
    setConfirmingBulkAction(action);
  };

  const executeBulkAction = async () => {
    if (!confirmingBulkAction) return;
    const action = confirmingBulkAction;
    
    setLoading(true);
    try {
      // Map selected IDs back to invoice details for the API
      const invoiceDetails: { ref: string; buyerPhone: string; buyerName: string }[] = [];
      selectedInvoices.forEach(id => {
         const inv = invoices.find(i => (i.uuid || i.invoice_number || i.invoice_id || i.reference || String(invoices.indexOf(i))) === id);
         if (inv) {
             invoiceDetails.push({
               ref: inv.invoice_number || inv.reference || inv.invoice_id || '',
               buyerPhone: inv.buyer_msisdn || '',
               buyerName: inv.buyer_name || 'Customer'
             });
         }
      });
      
      const validDetails = invoiceDetails.filter(d => d.ref !== '');

      if (validDetails.length === 0) {
          alert('Could not resolve invoice numbers for selected items.');
          setLoading(false);
          return;
      }

      const result = await processBuyerInvoiceBulk(phoneNumber, validDetails, action, userName || 'Seller');
      
      if (result.success) {
          // Success message
          // alert(`Successfully processed ${result.processed} invoices.`);
          setSelectedInvoices(new Set()); // Clear selection
          setConfirmingBulkAction(null);
          fetchInvoicesData(phoneNumber, userName); // Refresh list
      } else {
          // Partial success or failure
          alert(`Processed: ${result.processed}, Failed: ${result.failed}\nErrors: ${result.errors.slice(0, 3).join(', ')}${result.errors.length > 3 ? '...' : ''}`);
          setSelectedInvoices(new Set()); 
          setConfirmingBulkAction(null);
          fetchInvoicesData(phoneNumber, userName);
      }
    } catch (err: any) {
      alert(`Bulk action failed: ${err.message}`);
    } finally {
      setLoading(false);
      setConfirmingBulkAction(null);
    }
  };

  const allSelected = invoices.length > 0 && selectedInvoices.size === invoices.length;

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
              <>
                {/* Bulk Actions for pending invoices */}
                {statusFilter === 'pending' && selectedInvoices.size > 0 && (
                  <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">{selectedInvoices.size} selected</span>
                    <div className="flex gap-2">
                      {confirmingBulkAction ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-5 duration-200">
                           <span className="text-xs text-gray-600 font-medium hidden sm:inline">Confirm {confirmingBulkAction === 'accept' ? 'Approve' : 'Reject'}?</span>
                           <span className="text-xs text-gray-600 font-medium sm:hidden">Confirm?</span>
                           <button onClick={executeBulkAction} disabled={loading} className={`px-3 py-1.5 text-white text-xs rounded font-medium disabled:opacity-50 ${confirmingBulkAction === 'accept' ? 'bg-[var(--kra-green)]' : 'bg-red-600'}`}>Yes</button>
                           <button onClick={() => setConfirmingBulkAction(null)} disabled={loading} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded font-medium disabled:opacity-50">No</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => initiateBulkAction('reject')} disabled={loading} className="px-2 py-1 bg-red-600 text-white text-xs rounded font-medium disabled:opacity-50">Reject</button>
                          <button onClick={() => initiateBulkAction('accept')} disabled={loading} className="px-2 py-1 bg-[var(--kra-green)] text-white text-xs rounded font-medium disabled:opacity-50">Approve</button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <Card>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        {statusFilter === 'pending' && (
                          <th className="w-8 py-1.5">
                            <button onClick={toggleSelectAll} className="flex items-center justify-center">
                              {allSelected ? <CheckSquare className="w-4 h-4 text-[var(--kra-red)]" /> : <Square className="w-4 h-4 text-gray-400" />}
                            </button>
                          </th>
                        )}
                        <th className="text-left py-1.5 px-1 font-medium text-gray-600">Invoice</th>
                        <th className="text-right py-1.5 px-1 font-medium text-gray-600">Amount</th>
                        <th className="text-center py-1.5 px-1 font-medium text-gray-600">{statusFilter === 'rejected' ? 'View' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice, idx) => {
                        const invoiceId = invoice.uuid || invoice.invoice_number || invoice.invoice_id || invoice.reference || String(idx);
                        const isSelected = selectedInvoices.has(invoiceId);
                        return (
                          <tr key={invoiceId} className="border-b last:border-0 hover:bg-gray-50">
                            {statusFilter === 'pending' && (
                              <td className="py-2 px-1" onClick={(e) => toggleInvoiceSelection(invoiceId, e)}>
                                {isSelected ? <CheckSquare className="w-4 h-4 text-[var(--kra-red)] cursor-pointer" /> : <Square className="w-4 h-4 text-gray-400 cursor-pointer" />}
                              </td>
                            )}
                            <td className="py-2 px-1">
                              <span className="font-medium text-gray-800">{invoice.invoice_number || invoice.reference || 'N/A'}</span>
                              <span className="block text-[10px] text-gray-400">{invoice.buyer_name || 'Unknown'}</span>
                            </td>
                            <td className="py-2 px-1 text-right font-medium">{Number(invoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-2 px-1">
                              <div className="flex items-center justify-center gap-1">
                                  {statusFilter !== 'rejected' && (
                                  <button 
                                    onClick={(e) => handleDownloadInvoice(invoice, e)}
                                    disabled={sendingPdf === invoiceId}
                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded text-blue-600 disabled:opacity-50"
                                    title="Send to WhatsApp"
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
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default function SellerPending() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">Loading...</div>}><SellerPendingContent /></Suspense>;
}
