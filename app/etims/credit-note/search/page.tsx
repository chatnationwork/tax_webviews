'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Input, Button } from '../../_components/Layout';
import { saveCreditNote, Invoice, InvoiceItem } from '../../_lib/store';
import { searchCreditNoteInvoice } from '../../../actions/etims';
import { Loader2 } from 'lucide-react';

export default function CreditNoteSearch() {
  const router = useRouter();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setError('');
    
    if (!phoneNumber) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);

    try {
      const result = await searchCreditNoteInvoice(phoneNumber, invoiceNumber);
      
      if (result.success && result.invoice) {
        // Map API response to Store Invoice format
        const apiInvoice = result.invoice;
        const mappedInvoice: Invoice = {
          id: apiInvoice.invoice_id || apiInvoice.invoice_no,
          invoiceNumber: apiInvoice.invoice_no,
          buyer: {
            name: apiInvoice.buyer_name || 'Unknown Buyer',
            pin: '' // API might not return PIN in this endpoint
          },
          items: (apiInvoice.items || []).map((item, idx) => ({
             id: item.item_id || String(idx),
             type: 'product', // Assume product
             name: item.item_name,
             unitPrice: item.unit_price,
             quantity: item.quantity
          })),
          total: apiInvoice.total_amount,
          subtotal: apiInvoice.total_amount / 1.16, // Approximate if tax included
          tax: apiInvoice.total_amount - (apiInvoice.total_amount / 1.16),
          date: new Date().toISOString().split('T')[0], // API doesn't return date?
          partialCreditUsed: false 
        };

        saveCreditNote({ invoice: mappedInvoice, msisdn: phoneNumber });
        router.push('/etims/credit-note/found');
      } else {
        setError(result.error || 'Invoice not found. Please check the details and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while searching for the invoice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout 
      title="Credit Note" 
      step="Step 1 of 5"
      onBack={() => router.push('/etims')}
    >
      <div className="space-y-4">
        <Card>
          <div className="space-y-4">
             <Input
                label="Phone Number"
                value={phoneNumber}
                onChange={setPhoneNumber}
                placeholder="e.g. 0712345678"
                required
              />
              <Input
                label="Invoice Number"
                value={invoiceNumber}
                onChange={setInvoiceNumber}
                placeholder="e.g. INV-2024-001"
                required
              />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </Card>

        <Button onClick={handleSearch} disabled={!invoiceNumber.trim() || !phoneNumber.trim() || loading}>
          {loading ? (
             <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
             </div>
          ) : 'Search Invoice'}
        </Button>
      </div>
    </Layout>
  );
}
