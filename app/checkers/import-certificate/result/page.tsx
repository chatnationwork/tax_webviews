'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { Loader2, CheckCircle, FileText, Calendar, Activity } from 'lucide-react';

interface ImportCertResult {
  certificateNo: string;
  issueDate: string;
  status: string;
}

function ImportCertResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  
  const [result, setResult] = useState<ImportCertResult | null>(null);

  useEffect(() => {
    const storedResult = sessionStorage.getItem('importCertResult');
    if (storedResult) {
      setResult(JSON.parse(storedResult));
    } else {
      router.push('/checkers/import-certificate');
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
    <Layout title="Import Certificate Result" onBack={() => router.push('/checkers/import-certificate')}>
      <div className="space-y-4">
        <div className="bg-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Import Certificate is Valid</h1>
              <p className="text-green-100 text-xs">Certificate verification successful</p>
            </div>
          </div>
        </div>

        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Import Certificate Details</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Import Certificate Number</p>
                <p className="text-sm font-medium text-gray-900">{result.certificateNo}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Date of Issue</p>
                <p className="text-sm font-medium text-gray-900">{result.issueDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Activity className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium text-gray-900">{result.status}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="secondary"
            onClick={() => router.push('/checkers/import-certificate')}
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

export default function ImportCertResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <ImportCertResultContent />
    </Suspense>
  );
}
