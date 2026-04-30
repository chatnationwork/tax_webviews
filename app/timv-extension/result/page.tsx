'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Home } from 'lucide-react';
import { Layout, Card, Button } from '../../_components/Layout';

function formatDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refNo = searchParams.get('ref_no') ?? '';
  const days = searchParams.get('days') ?? '';
  const newExit = searchParams.get('new_exit') ?? '';

  return (
    <Layout title="Extension Submitted" showHeader={false}>
      <div className="space-y-5">
        {/* KRA Logo */}
        <div className="flex justify-center pt-4">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-16 w-auto" />
        </div>

        <Card className="bg-white border-gray-200 p-6 space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-gray-900">Extension Submitted</h2>
            <p className="text-xs text-gray-500">Your TIMV extension request has been submitted for processing.</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-left">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Reference No</span>
              <span className="font-medium text-gray-900">{refNo}</span>
            </div>
            {days && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Extension Period</span>
                <span className="font-medium text-gray-900">{days} days</span>
              </div>
            )}
            {newExit && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">New Exit Date</span>
                <span className="font-medium text-gray-900">{formatDate(newExit)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-green-700">Submitted</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Please allow processing time. You will be notified once your extension is approved.
          </p>
        </Card>

        <Button
          onClick={() => router.push('/')}
          className="w-full flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Button>

        <button
          onClick={() => router.push('/timv-extension')}
          className="w-full py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          Apply Another Extension
        </button>
      </div>
    </Layout>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--kra-red)] border-t-transparent rounded-full" />
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
