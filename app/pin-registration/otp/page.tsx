'use client';

import { useState, useRef, KeyboardEvent, ClipboardEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Button } from '../../_components/Layout';
import { savePhoneNumber, getPhoneNumber } from '../_lib/store';
import { generateOTP, validateOTP } from '../../actions/pin-registration';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function OTPVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneFromUrl = searchParams.get('phone');
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get phone from URL or session
    const storedPhone = phoneFromUrl || getPhoneNumber() || '';
    setPhone(storedPhone);
    
    // Auto-send OTP on load if we have a phone number
    if (storedPhone) {
      handleSendOTP(storedPhone);
    }
  }, [phoneFromUrl]);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleSendOTP = async (phoneNumber: string) => {
    if (!phoneNumber) return;
    setIsSendingOtp(true);
    setError('');
    
    try {
      const result = await generateOTP(phoneNumber);
      if (!result.success) {
        setError(result.message);
      }
      setTimer(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
  };

  const handleVerify = async () => {
    if (!otp.every(digit => digit !== '')) return;
    
    setIsLoading(true);
    setError('');

    try {
      const otpCode = otp.join('');
      const result = await validateOTP(phone || '254712345678', otpCode);
      
      if (result.success) {
        savePhoneNumber(phone || '+254 712 345 678');
        router.push('/pin-registration/select-type');
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (timer === 0 && phone) {
      handleSendOTP(phone);
    }
  };

  return (
    <Layout title="Verify Your Phone Number" onBack={() => router.back()}>
      <p className="text-gray-600 mb-6">
        Enter the 6-digit code sent to your phone number
      </p>



      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-2 mb-6 justify-center">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={el => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={isLoading}
            className="w-12 h-14 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none disabled:bg-gray-100"
          />
        ))}
      </div>

      <div className="text-center mb-8">
        {isSendingOtp ? (
          <p className="text-gray-600 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending OTP...
          </p>
        ) : timer > 0 ? (
          <p className="text-gray-600">Resend code in {timer}s</p>
        ) : (
          <button 
            onClick={handleResend}
            className="text-green-600 underline font-medium"
          >
            Resend Code
          </button>
        )}
      </div>

      <Button 
        onClick={handleVerify}
        disabled={!otp.every(digit => digit !== '') || isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Verifying...
          </span>
        ) : (
          'Verify OTP'
        )}
      </Button>
    </Layout>
  );
}

export default function OTPVerification() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <OTPVerificationContent />
    </Suspense>
  );
}
