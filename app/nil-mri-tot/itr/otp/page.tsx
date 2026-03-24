'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Layout, Card, Button } from '../../../_components/Layout';
import {
  generateOTP,
  verifyOTP,
  checkSession,
} from '@/app/actions/nil-mri-tot';
import { Loader2, Smartphone } from 'lucide-react';

function ItrOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [booting, setBooting] = useState(true);

  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';

  useEffect(() => {
    if (!phone) {
      router.replace('/nil-mri-tot/itr/validation');
      return;
    }

    let cancelled = false;

    const run = async () => {
      setBooting(true);
      setError('');
      try {
        const ok = await checkSession();
        if (cancelled) return;
        if (ok) {
          router.replace(`/nil-mri-tot/itr/verify${phoneParam}`);
          return;
        }
        setSending(true);
        const result = await generateOTP(phone);
        if (cancelled) return;
        if (result.success) {
          setOtpSent(true);
        } else {
          setError(result.error || result.message || 'Failed to send OTP');
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to send OTP');
        }
      } finally {
        if (!cancelled) {
          setSending(false);
          setBooting(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [phone, phoneParam, router]);

  const handleVerify = async () => {
    if (!otp.trim() || otp.trim().length < 4) {
      setError('Enter the OTP sent to your phone');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyOTP(phone, otp.trim());
      if (result.success) {
        router.push(`/nil-mri-tot/itr/verify${phoneParam}`);
      } else {
        setError(result.error || result.message || 'Invalid OTP');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setSending(true);
    setError('');
    try {
      const result = await generateOTP(phone);
      if (!result.success) {
        setError(result.error || result.message || 'Failed to resend OTP');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to resend OTP');
    } finally {
      setSending(false);
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    );
  }

  return (
    <Layout
      title="Verify phone"
      onBack={() => router.push(`/nil-mri-tot/itr/validation${phoneParam}`)}
      showMenu
    >
      <div className="space-y-4">
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Income Tax Return</h1>
          <p className="text-gray-400 text-xs">Step 2/4 — Phone verification</p>
        </div>

        <Card className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-[var(--kra-red)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-800">
                We sent a one-time code to{' '}
                <span className="font-medium">{phone}</span> via WhatsApp.
              </p>
              {!otpSent && sending && (
                <p className="text-xs text-gray-500 mt-2">Sending code…</p>
              )}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-700">OTP code</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Enter OTP"
            />
          </label>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <Button
            onClick={handleVerify}
            disabled={loading || sending}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Verifying…
              </>
            ) : (
              'Verify & continue'
            )}
          </Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={sending || loading}
            className="w-full text-center text-sm text-[var(--kra-red)] font-medium disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Resend code'}
          </button>
        </Card>
      </div>
    </Layout>
  );
}

export default function ItrOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      }
    >
      <ItrOtpContent />
    </Suspense>
  );
}
