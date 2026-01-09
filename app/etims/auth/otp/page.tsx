'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { registerTaxpayer, generateOTP, verifyOTP } from '../../../actions/etims';
import { saveUserSession } from '../../_lib/store';
import { Loader2, MessageSquare, CheckCircle } from 'lucide-react';

function OTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('number') || '';
  const idNumber = searchParams.get('id') || '';
  const name = searchParams.get('name') || '';
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auto-send OTP on mount
  useEffect(() => {
    if (phoneNumber && idNumber && !otpSent) {
      handleSendOTP();
    }
  }, []);

  const handleSendOTP = async () => {
    setSending(true);
    setError('');
    
    try {
      const result = await generateOTP(phoneNumber);
      if (result.success) {
        setOtpSent(true);
      } else {
        setError(result.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    if (!otp || otp.length < 4) { setError('Enter valid OTP'); return; }

    setLoading(true);
    
    try {
      // First verify OTP
      const otpResult = await verifyOTP(phoneNumber, otp);
      
      if (!otpResult.success) {
        setError(otpResult.error || 'Invalid OTP');
        setLoading(false);
        return;
      }

      // OTP valid, now register the user
      const regResult = await registerTaxpayer(idNumber, phoneNumber);
      
      if (regResult.success) {
        saveUserSession({ msisdn: phoneNumber, name });
        setSuccess(true);
        
        // Mock WhatsApp message
        console.log('Sending WhatsApp registration confirmation to:', phoneNumber);
        
        setTimeout(() => {
          router.push(`/etims?number=${encodeURIComponent(phoneNumber)}`);
        }, 2000);
      } else {
        setError(regResult.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!phoneNumber || !idNumber) {
    return (
      <Layout title="Verify OTP" onBack={() => router.push('/etims/auth')}>
        <Card className="text-center py-6">
          <p className="text-red-600 text-sm">Missing information</p>
          <Button className="mt-3" onClick={() => router.push('/etims/auth')}>Start Over</Button>
        </Card>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout title="Success" showHeader={false} showFooter={false}>
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Registration Complete!</h1>
            <p className="text-sm text-gray-500">Welcome to eTIMS, {name}</p>
          </div>
          <p className="text-xs text-gray-400">Redirecting to dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Verify OTP" showHeader={false} showFooter={false} onBack={() => router.back()}>
      <div className="space-y-4">
        {/* Logo */}
        <div className="flex justify-center py-2">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-12 w-auto" />
        </div>

        {/* Header */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">OTP Verification</h1>
          <p className="text-gray-400 text-xs">Step 3/3 - Verify phone number</p>
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium">{otpSent ? 'OTP sent to ' : 'Sending OTP to '}{phoneNumber}</p>
              <p className="text-blue-600">Check your SMS for the verification code</p>
            </div>
          </div>
        </Card>

        {/* OTP Input */}
        <Card>
          <label className="block text-xs text-gray-600 font-medium mb-2">Enter OTP <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase())}
            placeholder="Enter code"
            className="w-full px-3 py-2.5 text-center text-lg tracking-widest border border-gray-300 rounded-lg"
            maxLength={6}
          />
          
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSendOTP}
              disabled={sending}
              className="text-xs text-[var(--kra-red)] font-medium disabled:text-gray-400"
            >
              {sending ? 'Sending...' : 'Resend OTP'}
            </button>
          </div>
        </Card>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <Button onClick={handleVerifyOTP} disabled={loading || !otp}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Verifying...</> : 'Verify & Complete'}
        </Button>
      </div>
    </Layout>
  );
}

export default function OTPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <OTPContent />
    </Suspense>
  );
}
