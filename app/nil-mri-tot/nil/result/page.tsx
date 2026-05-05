'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Layout, Card } from '../../../_components/Layout';
import { ResultActions } from '../../../_components/ResultActions';
import { taxpayerStore } from '../../_lib/store';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getKnownPhone } from '@/app/_lib/session-store';
import { JourneyCompletionTracker } from './JourneyCompletionTracker';

function NilResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const ack = searchParams.get('ack');
    if (ack) {
      taxpayerStore.setReceiptNumber(ack);
    }
    setTaxpayerInfo(taxpayerStore.getTaxpayerInfo());
    setMounted(true);
  }, [searchParams]);

  if (!mounted) {
    return null;
  }

  return (
    <Layout title={taxpayerInfo?.error ? 'Filing Error' : 'Success'} showHeader={false}>
      <div className="space-y-4">
        {/* Success/Error Card */}
        {taxpayerInfo?.error ? (
          <Card className="bg-red-50 border-red-200 text-center py-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center shadow-sm">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>

              <div>
                <h2 className="text-red-900 text-xl font-bold mb-2">Filing Failed</h2>
                <p className="text-sm text-red-800 px-4">{taxpayerInfo.error}</p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-green-50 border-green-200 text-center py-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center shadow-sm">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <div>
                <h2 className="text-green-900 text-xl font-bold mb-2">Filing Successful!</h2>
                <p className="text-sm text-green-800 px-4">
                  Your{' '}
                  <span className="font-semibold">{taxpayerInfo?.selectedNilType?.toUpperCase()} NIL return</span> for{' '}
                  {taxpayerInfo?.fullName} has been filed.
                </p>

                {(taxpayerStore as any).receiptNumber ? (
                  <div className="mt-4 bg-white/60 px-4 py-2 rounded-lg inline-block border border-green-200">
                    <p className="text-xs text-green-600 uppercase font-semibold">Receipt Number</p>
                    <p className="text-lg font-mono text-green-800">{(taxpayerStore as any).receiptNumber}</p>
                  </div>
                ) : null}
              </div>

              <p className="text-xs text-blue-800 bg-blue-100/50 px-4 py-2 rounded-full mt-4">
                Confirmation sent to your registered number
              </p>
            </div>
          </Card>
        )}

        <JourneyCompletionTracker
          success={!taxpayerInfo?.error}
          phone={taxpayerStore.getMsisdn() || getKnownPhone() || undefined}
        />

        <div className="space-y-3 pt-2">
          <button
            onClick={() => {
              const phone = taxpayerStore.getMsisdn() || getKnownPhone();
              router.push(`/nil-mri-tot/nil/validation${phone ? `?phone=${phone}` : ''}`);
            }}
            className="w-full py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors border border-blue-200"
          >
            File Another Return
          </button>

          <ResultActions journey="NIL Filing" />
        </div>
      </div>
    </Layout>
  );
}

export default function NilResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      }
    >
      <NilResultContent />
    </Suspense>
  );
}
