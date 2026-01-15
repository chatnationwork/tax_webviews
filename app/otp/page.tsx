'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MessageSquare } from 'lucide-react';
import { generateOTP, validateOTP } from '../actions/auth';
import { Button, Card, Layout } from '../_components/Layout';
import { saveUserSession } from '../_lib/session-store';

function OTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('phone') || searchParams.get('number') || '';
  
  /* retrieve redirect param - default to home */
  const redirectPath = searchParams.get('redirect') || '/';

  /**
   * Get human-readable service name from redirect path
   */
  const getServiceName = (path: string): string | null => {
    const pathLower = path.toLowerCase();
    
    if (pathLower.includes('/nil/')) return 'NIL Returns';
    if (pathLower.includes('/mri/')) return 'Monthly Rental Income';
    if (pathLower.includes('/tot/')) return 'Turnover Tax';
    if (pathLower.includes('/tcc/')) return 'Tax Compliance Certificate';
    if (pathLower.includes('/payroll')) return 'Payroll';
    if (pathLower.includes('/customs')) return 'Customs';
    if (pathLower.includes('/invoice')) return 'e-Invoicing';
    if (pathLower.includes('/f88')) return 'F88';
    if (pathLower.includes('/etims')) return 'ETIMS';
    if (pathLower.includes('/pin-registration')) return 'Pin Registration';
    
    return null;
  };

  const serviceName = getServiceName(redirectPath);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

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
        setError(result.error || result.message || 'Failed to send OTP');
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
      // Verify OTP - this also sets the session cookie
      const otpResult = await validateOTP(phoneNumber, otp);
      
      if (!otpResult.success) {
        setError(otpResult.error || otpResult.message || 'Invalid OTP');
        setLoading(false);
        return;
      }
      
      // Save client-side session to sync with server session
      // This prevents useSessionManager hook from redirecting away
      saveUserSession({ msisdn: phoneNumber });
      
      // Save phone to localStorage for persistence
      try {
        localStorage.setItem('phone_Number', phoneNumber);
      } catch (e) {
        console.error('Failed to save phone to local storage', e);
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
    <Layout title="Verify OTP" showHeader={false} showFooter={true} onBack={() => router.back()}>
      <div className="space-y-4">
        {/* Logo */}
        <div className="flex justify-center py-2">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-12 w-auto" />
        </div>

     
        {/* Error State if No Phone */}
        {!phoneNumber && (
           <Card className="bg-red-50 border-red-200">
             <div className="flex items-start gap-2">
               <MessageSquare className="w-5 h-5 text-red-600 flex-shrink-0" />
               <div className="text-xs text-red-800">
                 <p className="font-medium">Missing Information</p>
                 <p className="text-red-700">Phone number is missing from the request. We cannot verify your identity.</p>
                 <Button onClick={() => router.push('/')} className="mt-2 text-xs bg-red-600 hover:bg-red-700 w-auto text-white">
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
                <p className="font-medium">We have sent a login OTP to {phoneNumber}</p>
                <p className="text-blue-600">Enter the code to continue</p>
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
                {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Verifying...</> : 'Continue'}
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
