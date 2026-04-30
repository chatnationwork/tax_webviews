'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Layout, Card, Button } from '../../_components/Layout';
import { generateExtensionOtp, verifyExtensionOtp } from '../../actions/customs';

function OtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refNo = searchParams.get('ref_no') ?? '';

  const [cert, setCert] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('timv_extension');
    if (!raw || !refNo) {
      router.replace('/timv-extension');
      return;
    }
    const parsed = JSON.parse(raw);
    setCert(parsed.cert);
  }, []);

  const sendOtp = async (certData: any) => {
    setSending(true);
    setError('');
    const email = certData?.traveler_details?.owner_email ?? '';
    const msisdn = certData?.traveler_details?.owner_phone ?? '';
    const res = await generateExtensionOtp(email, msisdn);
    setSending(false);
    if (res.success) {
      setSent(true);
    } else {
      setError(res.error ?? 'Failed to send OTP. Please try again.');
    }
  };

  useEffect(() => {
    if (cert) sendOtp(cert);
  }, [cert]);

  const handleVerify = async () => {
    if (!otp.trim()) return;
    setVerifying(true);
    setError('');
    const res = await verifyExtensionOtp(refNo, otp.trim().toUpperCase());
    setVerifying(false);
    if (res.success) {
      router.push(`/timv-extension/extension?ref_no=${refNo}`);
    } else {
      setError(res.error ?? 'OTP verification failed. Please try again.');
    }
  };

  const ownerEmail = cert?.traveler_details?.owner_email ?? '';
  const ownerPhone = cert?.traveler_details?.owner_phone ?? '';

  return (
    <Layout title="OTP Verification" showHeader={false}>
      <div className="space-y-5">
        {/* KRA Logo */}
        <div className="flex justify-center pt-4">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-16 w-auto" />
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-base font-bold text-gray-900">Verify Your Identity</h1>
          <p className="text-xs text-gray-500">TIMV Extension — Ref: {refNo}</p>
        </div>

        <Card className="bg-white border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 bg-[var(--kra-red)]/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[var(--kra-red)]" />
            </div>
          </div>

          {sending && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending OTP...</span>
            </div>
          )}

          {sent && (
            <div className="text-center space-y-1">
              <p className="text-sm text-gray-700">
                An OTP has been sent to:
              </p>
              {ownerEmail && (
                <p className="text-xs font-medium text-gray-900">{ownerEmail}</p>
              )}
              {ownerPhone && (
                <p className="text-xs text-gray-500">{ownerPhone}</p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Enter OTP</label>
            <input
              ref={inputRef}
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder="Enter OTP code"
              maxLength={10}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[var(--kra-red)]"
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={verifying || !otp.trim() || sending}
            className="w-full flex items-center justify-center gap-2"
          >
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify OTP'}
          </Button>

          {sent && (
            <button
              onClick={() => cert && sendOtp(cert)}
              disabled={sending}
              className="w-full text-center text-xs text-[var(--kra-red)] hover:underline disabled:opacity-50"
            >
              Resend OTP
            </button>
          )}
        </Card>

        <button
          onClick={() => router.back()}
          className="w-full py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </Layout>
  );
}

export default function OtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--kra-red)] border-t-transparent rounded-full" />
        </div>
      }
    >
      <OtpContent />
    </Suspense>
  );
}
