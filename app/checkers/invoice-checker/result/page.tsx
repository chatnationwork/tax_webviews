'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { Loader2, CheckCircle, FileText, Calendar, User, DollarSign } from 'lucide-react';

interface InvoiceResult {
  invoiceNumber: string;
  salesDate: string;
  supplierName: string;
  totalInvoiceAmount: string;
  totalTaxableAmount: string;
  totalTaxAmount: string;
}

function InvoiceResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  
  const [result, setResult] = useState<InvoiceResult | null>(null);

  useEffect(() => {
    const storedResult = sessionStorage.getItem('invoiceCheckerResult');
    if (storedResult) {
      setResult(JSON.parse(storedResult));
    } else {
      router.push('/checkers/invoice-checker');
    }
  }, [router]);

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    );
  }

  return (
    <Layout title="Invoice Verification Result" onBack={() => router.push('/checkers/invoice-checker')}>
      <div className="space-y-4">
        <div className="bg-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Invoice is Valid</h1>
              <p className="text-green-100 text-xs">eTIMS invoice verification successful</p>
            </div>
          </div>
        </div>

        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Invoice Details</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Invoice Number</p>
                <p className="text-sm font-medium text-gray-900">{result.invoiceNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Invoice Date</p>
                <p className="text-sm font-medium text-gray-900">{result.salesDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Supplier Name</p>
                <p className="text-sm font-medium text-gray-900">{result.supplierName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Total Invoice Amount</p>
                <p className="text-sm font-medium text-gray-900">KES {result.totalInvoiceAmount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Taxable Amount</p>
                <p className="text-sm font-medium text-gray-900">KES {result.totalTaxableAmount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Tax Amount</p>
                <p className="text-sm font-medium text-gray-900">KES {result.totalTaxAmount}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="secondary"
            onClick={() => router.push('/checkers/invoice-checker')}
          >
            Check Another
          </Button>
          <Button 
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function InvoiceResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <InvoiceResultContent />
    </Suspense>
  );
}
