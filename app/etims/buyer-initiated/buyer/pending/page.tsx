'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Input, Button } from '../../../_components/Layout';
import { fetchInvoices } from '../../../../actions/etims';
import { FetchedInvoice } from '../../../_lib/definitions';
import { ChevronRight, Loader2, Phone } from 'lucide-react';

export default function BuyerInitiatedBuyerPending() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneSet, setIsPhoneSet] = useState(false);
  const [invoices, setInvoices] = useState<FetchedInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetchInvoices = async () => {
    if (!phoneNumber.trim()) return;
    setLoading(true);
    setError('');
    
    try {
      const result = await fetchInvoices(phoneNumber);
      if (result.success && result.invoices) {
        setInvoices(result.invoices);
        setIsPhoneSet(true);
      } else {
        setError(result.error || 'No invoices found');
        // If empty list is success
        if (result.success && !result.invoices) {
            setInvoices([]);
            setIsPhoneSet(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceClick = (invoice: FetchedInvoice) => {
    // Pass phone number to view page to allow re-fetching or actions context
    const invoiceId = invoice.invoice_id || invoice.reference; // Use available ID
    router.push(`/etims/buyer-initiated/buyer/view?id=${invoiceId}&phone=${encodeURIComponent(phoneNumber)}`);
  };

  return (
    <Layout 
      title="Invoices Awaiting Action" 
      onBack={() => {
        if (isPhoneSet) {
          setIsPhoneSet(false);
          setInvoices([]);
        } else {
          router.push('/etims/buyer-initiated');
        }
      }}
    >
      <div className="space-y-4">
        {!isPhoneSet ? (
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-900 font-medium pb-2 border-b border-gray-100">
                <Phone className="w-5 h-5 text-gray-500" />
                <h3>Enter Your Phone Number</h3>
              </div>
              <p className="text-sm text-gray-600">
                Please enter your phone number to view pending invoices sent to you.
              </p>
              <Input
                label="Phone Number"
                value={phoneNumber}
                onChange={setPhoneNumber}
                placeholder="e.g. 0712345678"
                required
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <Button 
                onClick={handleFetchInvoices} 
                disabled={!phoneNumber.trim() || loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking...</span>
                  </div>
                ) : 'View Invoices'}
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {invoices.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-gray-600">No pending invoices found for {phoneNumber}</p>
                <div className="mt-4">
                     <Button variant="secondary" onClick={() => setIsPhoneSet(false)}>Check Another Number</Button>
                </div>
              </Card>
            ) : (
              <>
                <p className="text-sm text-gray-600 flex justify-between items-center">
                  <span>Found {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
                  <button onClick={() => setIsPhoneSet(false)} className="text-blue-600 hover:underline">Change Number</button>
                </p>
                
                {invoices.map((invoice, idx) => (
                  <button
                    key={invoice.invoice_id || idx}
                    onClick={() => handleInvoiceClick(invoice)}
                    className="w-full text-left transition-colors hover:bg-gray-50 rounded-lg"
                  >
                    <Card className="border-2 border-gray-200 hover:border-blue-400">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-gray-900 font-medium">{invoice.seller_name || 'Unknown Seller'}</h4>
                            <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 font-medium">
                              {invoice.status || 'Pending'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            Ref: {invoice.reference || invoice.invoice_id || 'N/A'}
                          </p>
                          <p className="text-gray-900 font-medium">
                            KES {(invoice.total_amount || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'Date N/A'}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </Card>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
