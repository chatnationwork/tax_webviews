'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { Loader2, CheckCircle, IdCard, Calendar, FileText, Activity } from 'lucide-react';

interface TccResult {
  kraPin: string;
  tccExpiryDate: string;
  tccIssueDate: string;
  tccNo: string;
  tccStatus: string;
}

function TccResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  
  const [result, setResult] = useState<TccResult | null>(null);

  useEffect(() => {
    const storedResult = sessionStorage.getItem('tccCheckerResult');
    if (storedResult) {
      setResult(JSON.parse(storedResult));
    } else {
      router.push('/checkers/tcc-checker');
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
    <Layout title="TCC Verification Result" onBack={() => router.push('/checkers/tcc-checker')}>
      <div className="space-y-4">
        <div className="bg-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Tax Compliance Certificate Valid</h1>
              <p className="text-green-100 text-xs">TCC verification successful</p>
            </div>
          </div>
        </div>

        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Tax Compliance Certificate Details</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <IdCard className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">PIN</p>
                <p className="text-sm font-medium text-gray-900">{result.kraPin}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">TCC Number</p>
                <p className="text-sm font-medium text-gray-900">{result.tccNo}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Date of Issue</p>
                <p className="text-sm font-medium text-gray-900">{result.tccIssueDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Expiry Date</p>
                <p className="text-sm font-medium text-gray-900">{result.tccExpiryDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Activity className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium text-gray-900">{result.tccStatus}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="secondary"
            onClick={() => router.push('/checkers/tcc-checker')}
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

export default function TccResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <TccResultContent />
    </Suspense>
  );
}
