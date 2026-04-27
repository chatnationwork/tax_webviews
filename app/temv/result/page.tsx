'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Layout, Card, Button } from '../../_components/Layout';
import { getCertSession, clearCertSession } from '../../_lib/cert-store';
import { getCertificate } from '../../actions/customs';

function TEMVResultContent() {
  const router = useRouter();
  const [session] = useState(() => getCertSession());
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.ref_no) {
      router.replace('/temv');
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const res = await getCertificate(session.ref_no);
        setCert(res?.data ?? res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load application status.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session, router]);

  if (!session?.ref_no) return null;

  const isSubmitted = cert?.submitted === true || cert?.status === 'submitted';

  return (
    <Layout title="TEMV — Result" showHeader={false} showFooter={false}>
      <div className="min-h-[80vh] flex flex-col items-center justify-center py-8 space-y-4">
        {loading ? (
          <Loader2 className="w-10 h-10 animate-spin text-[var(--kra-red)]" />
        ) : error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-red-600 text-center">{error}</p>
          </>
        ) : (
          <>
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center ${
                isSubmitted ? 'bg-green-100' : 'bg-amber-100'
              }`}
            >
              {isSubmitted ? (
                <CheckCircle className="w-10 h-10 text-green-600" />
              ) : (
                <Clock className="w-10 h-10 text-amber-600" />
              )}
            </div>

            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">
                {isSubmitted ? 'Application Submitted' : 'Application Saved'}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Reference:{' '}
                <span className="font-mono font-semibold text-gray-900">
                  {cert?.ref_no ?? session.ref_no}
                </span>
              </p>
            </div>

            <Card className="w-full max-w-sm space-y-2">
              {[
                { label: 'Status', value: cert?.status },
                { label: 'Type', value: cert?.type },
                { label: 'Submitted', value: cert?.submitted ? 'Yes' : 'No' },
                { label: 'Published', value: cert?.published ? 'Yes' : 'No' },
              ]
                .filter(r => r.value !== undefined && r.value !== null)
                .map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-xs text-gray-500">{r.label}</span>
                    <span className="text-xs font-medium text-gray-900">{String(r.value)}</span>
                  </div>
                ))}
            </Card>

            <div className="w-full max-w-sm space-y-3">
              <Button
                onClick={() => {
                  clearCertSession();
                  router.push('/temv');
                }}
                className="w-full"
              >
                New Application
              </Button>
              <Button variant="secondary" onClick={() => router.push('/')} className="w-full">
                Back to Services
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default function TEMVResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      }
    >
      <TEMVResultContent />
    </Suspense>
  );
}
