'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MessageSquare, CheckCircle } from 'lucide-react';
import { generateOTP, verifyOTP } from '../../actions/checkers';
import { Button, Card, Layout } from '../../_components/Layout';
import { saveUserSession, saveKnownPhone } from '../../_lib/session-store';

function OTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('number') || '';
  
  /* retrieve redirect param */
  const redirectPath = searchParams.get('redirect') || '/checkers/pin-checker';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auto-send OTP on mount if phone is present in params
  useEffect(() => {
    if (phoneNumber && !otpSent) {
      handleSendOTP(phoneNumber);
    } else if (!phoneNumber) {
      setError('Phone number is missing. Please restart the validation process.');
    }
  }, [phoneNumber]);

  const handleSendOTP = async (numberOverride?: string) => {
    const numberToSend = numberOverride || phoneNumber;
    if (!numberToSend) { setError('Phone number is missing'); return; }
    
    setSending(true);
    setError('');
    
    try {
      const result = await generateOTP(numberToSend);
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
    if (!phoneNumber) { setError('Phone number required'); return; }
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
      
      // Save phone to shared session store for persistence
      try {
        saveKnownPhone(phoneNumber);
        saveUserSession({ msisdn: phoneNumber });
      } catch (e) {
        console.error('Failed to save phone to session store', e);
      }

      // Redirect to the destination
      let finalPath = redirectPath;
      if (finalPath.includes('?')) {
        finalPath += `&phone=${encodeURIComponent(phoneNumber)}`;
      } else {
        finalPath += `?phone=${encodeURIComponent(phoneNumber)}`;
      }
      
      router.push(finalPath);
      
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-gray-400 text-xs">Verify phone number</p>
        </div>

        {/* Error State if No Phone */}
        {!phoneNumber && (
           <Card className="bg-red-50 border-red-200">
             <div className="flex items-start gap-2">
               <MessageSquare className="w-5 h-5 text-red-600 flex-shrink-0" />
               <div className="text-xs text-red-800">
                 <p className="font-medium">Missing Information</p>
                 <p className="text-red-700">Phone number is missing from the request. We cannot verify your identity.</p>
                 <Button onClick={() => router.push(redirectPath)} className="mt-2 text-xs bg-red-600 hover:bg-red-700 w-auto text-white">
                   Return Home
                 </Button>
               </div>
             </div>
           </Card>
        )}

        {/* OTP Sent Info */}
        {phoneNumber && otpSent && (
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">OTP sent to {phoneNumber}</p>
                <p className="text-blue-600">Check your SMS for the verification code</p>
              </div>
            </div>
          </Card>
        )}

        {/* Sending State / Initial Load */}
        {phoneNumber && !otpSent && (
            <Card className="py-8 text-center">
                 {sending ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                       <Loader2 className="w-6 h-6 animate-spin text-[var(--kra-red)]" />
                       <p className="text-sm text-gray-500">Sending OTP...</p>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                         <p className="text-sm text-gray-600 mb-2">Ready to send OTP to {phoneNumber}</p>
                         <Button onClick={() => handleSendOTP()} className="w-auto">
                           Send Code
                         </Button>
                    </div>
                 )}
            </Card>
        )}

        {/* OTP Input - Only show if OTP sent */}
        {otpSent && (
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
                onClick={() => handleSendOTP()}
                disabled={sending}
                className="text-xs text-[var(--kra-red)] font-medium disabled:text-gray-400"
              >
                {sending ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
          
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg mt-3">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="mt-4">
               <Button onClick={handleVerifyOTP} disabled={loading || !otp}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Verifying...</> : 'Verify'}
              </Button>
            </div>
          </Card>
        )}
        
        {/* Error for sending step if exists and not inside OTP Card */}
        {error && !otpSent && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
        )}
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
