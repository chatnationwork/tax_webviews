'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../_components/Layout';
import { generateOTP, verifyOTP } from '../../../actions/etims';
import { saveUserSession } from '../../_lib/store';
import { Loader2, MessageSquare, Shield } from 'lucide-react';



function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('number') || '';
  const userName = searchParams.get('name') || '';
  const userPin = searchParams.get('pin') || '';
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

  // Auto-send OTP on mount
  useEffect(() => {
    if (phoneNumber && !otpSent) {
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
    if (!otp || otp.length < 4) { 
      setError('Enter valid OTP'); 
      return; 
    }

    setLoading(true);
    
    try {
      const result = await verifyOTP(phoneNumber, otp);
      
      if (result.success) {
        // Save session and go to dashboard
        saveUserSession({ msisdn: phoneNumber, name: userName, pin: userPin });
        router.push('/etims');
      } else {
        setError(result.error || 'Invalid OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!phoneNumber) {
    return (
      <Layout title="Verify" onBack={() => router.push('/etims/auth')}>
        <Card className="text-center py-6">
          <p className="text-red-600 text-sm">Phone number missing</p>
          <Button className="mt-3" onClick={() => router.push('/etims/auth')}>Go Back</Button>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Verify Phone" showHeader={false} showFooter={false} onBack={() => router.push('/etims/auth')}>
      <div className="space-y-4">
        {/* Logo */}
        <div className="flex justify-center py-2">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-12 w-auto" />
        </div>

        {/* Header */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Verify Your Number</h1>
              <p className="text-gray-400 text-xs">Enter the OTP sent to your phone</p>
            </div>
          </div>
        </div>

        {/* Welcome */}
        {userName && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <p className="text-xs text-green-700">Welcome back, <span className="font-medium">{userName}</span>!</p>
          </div>
        )}

        {/* OTP Status */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium">
                {otpSent ? 'OTP sent to ' : 'Sending OTP to '}{phoneNumber}
              </p>
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
            disabled={loading}
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
          {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Verifying...</> : 'Continue'}
        </Button>

        
      </div>
    </Layout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
