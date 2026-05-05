'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Layout, Card, Button } from '../_components/Layout';
import { createCertificate } from '../actions/customs';
import { saveCertSession, clearCertSession } from '../_lib/cert-store';

function TEMVHomeContent() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    setStarting(true);
    setError('');
    try {
      clearCertSession();
      const res = await createCertificate('TEMV');
      const ref_no = res?.data?.ref_no ?? res?.ref_no;
      if (!ref_no) throw new Error('No reference number returned by server.');
      saveCertSession({ ref_no, type: 'TEMV' });
      router.push('/temv/exportation');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start application.');
      setStarting(false);
    }
  };

  return (
    <Layout title="TEMV" showHeader={false}>
      <div className="space-y-6">
        {/* KRA Logo */}
        <div className="flex justify-center pt-4">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-16 w-auto" />
        </div>

        {/* Info Card */}
        <Card className="bg-white border-gray-200 p-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--kra-red)]/10 rounded-full mx-auto">
              <span className="text-2xl font-bold text-[var(--kra-red)]">T</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Temporary Exportation of Motor Vehicles
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Apply for a TEMV certificate to temporarily take your Kenyan-registered vehicle
              out of Kenya and return without paying additional import duty. An OTP will be
              sent to the phone number registered to the vehicle for verification.
            </p>
          </div>
        </Card>

        {error && (
          <p className="text-xs text-red-600 text-center">{error}</p>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleContinue}
            disabled={starting}
            className="w-full flex items-center justify-center gap-2"
          >
            {starting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <button
            onClick={() => router.push('/')}
            className="w-full py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* KRA 30 Years */}
        <div className="flex justify-center pt-2">
          <img src="/kra30.jpg" alt="KRA 30 Years" className="w-full max-w-sm rounded-lg shadow-md" />
        </div>

        <div className="text-center pb-4">
          <p className="text-xs text-gray-400">Secure access to your TEMV certificate services.</p>
        </div>
      </div>
    </Layout>
  );
}

export default function TEMVPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--kra-red)] border-t-transparent rounded-full" />
        </div>
      }
    >
      <TEMVHomeContent />
    </Suspense>
  );
}
