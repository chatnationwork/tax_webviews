'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../_components/Layout';
import { searchCreditNoteInvoice } from '../../../actions/etims';
import { saveCreditNote, getUserSession, Invoice } from '../../_lib/store';
import { FileText, Search, Loader2 } from 'lucide-react';

function CreditNoteSearchContent() {
  const router = useRouter();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [creditNoteType, setCreditNoteType] = useState<'partial' | 'full' | ''>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const reasons = [
    { value: 'missing_quantity', label: 'Missing Quantity' },
    { value: 'missing_data', label: 'Missing Data' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'wasted', label: 'Wasted' },
    { value: 'raw_material_shortage', label: 'Raw Material Shortage' },
    { value: 'refund', label: 'Refund' },
  ];

  useEffect(() => { setMounted(true); }, []);

  const handleSearch = async () => {
    setError('');
    if (!invoiceNumber.trim()) { setError('Invoice number required'); return; }
    if (!creditNoteType) { setError('Select credit note type'); return; }
    if (!reason) { setError('Select a reason'); return; }

    setLoading(true);
    try {
      const session = getUserSession();
      if (!session?.msisdn) { setError('Session not found'); setLoading(false); return; }

      const result = await searchCreditNoteInvoice(session.msisdn, invoiceNumber.trim());
      if (result.success && result.invoice) {
        const invoice: Invoice = {
          id: result.invoice.invoice_id || invoiceNumber,
          invoiceNumber: result.invoice.invoice_no || invoiceNumber,
          items: result.invoice.items?.map((item: any, i: number) => ({
            id: item.id || String(i), 
            name: item.item_name, 
            type: 'product' as const,
            unitPrice: parseFloat(item.item_price || item.unit_price || 0), 
            quantity: parseFloat(item.quantity || 1)
          })) || [],
          subtotal: Number(result.invoice.total_amount) || 0, 
          tax: 0, 
          total: Number(result.invoice.total_amount) || 0, 
          date: new Date().toISOString()
        };
        saveCreditNote({ invoice, msisdn: session.msisdn, type: creditNoteType, reason });
        
        if (creditNoteType === 'partial') router.push('/etims/credit-note/partial-select');
        else router.push('/etims/credit-note/full-review');
      } else {
        setError(result.error || 'Invoice not found');
      }
    } catch (err: any) { setError(err.message || 'Search failed'); }
    finally { setLoading(false); }
  };

  if (!mounted) return null;

  return (
    <Layout title="Credit Note" showHeader={false} onBack={() => router.push('/etims')}>
      <div className="space-y-3">
        {/* Header */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5" />
            <h1 className="text-base font-semibold">Create Credit Note</h1>
          </div>
          <p className="text-gray-400 text-xs">Issue a credit against an existing invoice</p>
        </div>

        {/* Invoice Number */}
        <Card>
          <label className="block text-xs text-gray-600 font-medium mb-1">Invoice Number <span className="text-red-500">*</span></label>
          <div className="relative">
            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
              placeholder="e.g. 1004" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg pr-10" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </Card>

        {/* Credit Note Type */}
        <Card>
          <p className="text-xs text-gray-600 font-medium mb-2">Credit Note Type <span className="text-red-500">*</span></p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setCreditNoteType('partial')}
              className={`py-2.5 rounded-lg border-2 text-sm font-medium ${creditNoteType === 'partial' ? 'border-[var(--kra-red)] bg-red-50 text-[var(--kra-red)]' : 'border-gray-200 text-gray-600'}`}>
              Partial
            </button>
            <button onClick={() => setCreditNoteType('full')}
              className={`py-2.5 rounded-lg border-2 text-sm font-medium ${creditNoteType === 'full' ? 'border-[var(--kra-red)] bg-red-50 text-[var(--kra-red)]' : 'border-gray-200 text-gray-600'}`}>
              Full
            </button>
          </div>
        </Card>

        {/* Reason */}
        <Card>
          <label className="block text-xs text-gray-600 font-medium mb-1">Reason <span className="text-red-500">*</span></label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
            <option value="">Select reason</option>
            {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Card>

        {error && <div className="p-2 bg-red-50 border border-red-200 rounded-lg"><p className="text-xs text-red-600">{error}</p></div>}

        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Searching...</> : 'Search Invoice'}
        </Button>
      </div>
    </Layout>
  );
}

export default function CreditNoteSearch() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">Loading...</div>}><CreditNoteSearchContent /></Suspense>;
}
