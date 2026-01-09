'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { IDInput } from '../../../_components/KRAInputs';
import { YearOfBirthInput } from '../../../_components/YearOfBirthInput';
import { lookupById, registerTaxpayer, checkUserStatus, generateOTP, verifyOTP } from '../../../actions/etims';
import { Loader2, ArrowLeft, Smartphone } from 'lucide-react';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('number') || '';
  
  const [step, setStep] = useState(1); // 1: ID input, 2: Preview/Terms, 3: OTP verification
  const [idNumber, setIdNumber] = useState('');
  const [yearOfBirth, setYearOfBirth] = useState('');
  const [userDetails, setUserDetails] = useState<{ idNumber: string; name: string; pin?: string } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isIdValid, setIsIdValid] = useState(false);
  const [isYearValid, setIsYearValid] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleValidateId = async () => {
    setError('');
    if (!idNumber.trim()) { setError('Enter ID number'); return; }
    if (!/^\d{6,8}$/.test(idNumber.trim())) { setError('ID must be 6-8 digits'); return; }
    if (!yearOfBirth || yearOfBirth.length !== 4) { setError('Enter a valid year of birth'); return; }

    setLoading(true);
    try {
      const result = await lookupById(idNumber.trim(), phoneNumber, yearOfBirth);
      if (result.success && result.name) {
        setUserDetails({ idNumber: result.idNumber!, name: result.name, pin: result.pin });
        setStep(2);
      } else {
        setError(result.error || 'ID validation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToOTP = async () => {
    if (!termsAccepted) { setError('Please accept terms & conditions'); return; }
    
    setLoading(true);
    setError('');
    
    try {
      // First check user status - don't register users with VAT
      const statusResult = await checkUserStatus(phoneNumber);
      
      if (statusResult.success && statusResult.isRegistered) {
        setError('This phone number is already registered. Please login instead.');
        setLoading(false);
        return;
      }
      
      if (statusResult.success && statusResult.hasVat) {
        setError('VAT-registered businesses cannot register. Please contact KRA for assistance.');
        setLoading(false);
        return;
      }
      
      // Send OTP to user's phone
      const otpResult = await generateOTP(phoneNumber);
      if (otpResult.success) {
        setOtpSent(true);
        setStep(3);
      } else {
        setError(otpResult.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateOTP(phoneNumber);
      if (result.success) {
        setError(''); // Clear any previous error
        alert('OTP sent successfully!');
      } else {
        setError(result.error || 'Failed to resend OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!otp.trim() || otp.length < 4) { setError('Enter a valid OTP'); return; }
    
    setLoading(true);
    setError('');
    
    try {
      // First verify OTP
      const verifyResult = await verifyOTP(phoneNumber, otp);
      if (!verifyResult.success) {
        setError(verifyResult.error || 'Invalid OTP. Please try again.');
        setLoading(false);
        return;
      }
      
      // OTP verified - now register
      const result = await registerTaxpayer(idNumber, phoneNumber);
      
      // Treat "ETIMS inactive" as success - user is registered, ETIMS will activate on first use
      const isRegisteredButInactive = result.error?.toLowerCase().includes('etims inactive');
      
      if (result.success || isRegisteredButInactive) {
        const params = new URLSearchParams({
          phone: phoneNumber,
          name: userDetails?.name || '',
          pin: userDetails?.pin || ''
        });
        router.push(`/etims/auth/signup/success?${params.toString()}`);
      } else {
        const errorMsg = result.error || 'Registration failed. Please try again.';
        setError(errorMsg);
        
        // Handle "In Progress" case - show error then redirect home
        if (errorMsg.toLowerCase().includes('in progress')) {
          //
          // disable continue button
          
          setTimeout(() => {
            router.push('/etims/auth?number=' + phoneNumber);
          }, 2000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 1) router.push('/etims/auth');
    else if (step === 3) setStep(2);
    else setStep(1);
  };

  if (!phoneNumber) {
    return (
      <Layout title="Sign Up" onBack={() => router.push('/etims/auth')}>
        <Card className="text-center py-6">
          <p className="text-red-600 text-sm">Phone number missing</p>
          <Button className="mt-3" onClick={() => router.push('/etims/auth')}>Go Back</Button>
        </Card>
      </Layout>
    );
  }

  const getStepInfo = () => {
    switch(step) {
      case 1: return { title: 'Sign Up', subtitle: 'Step 1/3 - Verify identity' };
      case 2: return { title: 'Confirm Details', subtitle: 'Step 2/3 - Review & accept' };
      case 3: return { title: 'Verify Phone', subtitle: 'Step 3/3 - Enter OTP' };
      default: return { title: 'Sign Up', subtitle: '' };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <Layout title="Sign Up" showHeader={false} showFooter={false} onBack={handleBack}>
      <div className="space-y-4">
        {/* Logo */}
        <div className="flex justify-center py-2">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-12 w-auto" />
        </div>

        {/* Header */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">{stepInfo.title}</h1>
          <p className="text-gray-400 text-xs">{stepInfo.subtitle}</p>
        </div>

        {step === 1 ? (
          <>
            {/* ID Input */}
            <Card>
              <div className="space-y-3">
                <IDInput
                  label="ID Number"
                  value={idNumber}
                  onChange={setIdNumber}
                  onValidationChange={setIsIdValid}
                  required
                  className="text-sm py-2"
                />
                <YearOfBirthInput
                  label="Year of Birth"
                  value={yearOfBirth}
                  onChange={setYearOfBirth}
                  onValidationChange={setIsYearValid}
                  required
                  className="text-sm py-2"
                />
              </div>
            </Card>

            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <Button onClick={handleValidateId} disabled={loading || !isIdValid || !isYearValid}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Validating...</> : 'Validate'}
            </Button>
          </>
        ) : step === 2 && userDetails ? (
          <>
            {/* Preview */}
            <Card className="bg-green-50 border-green-200">
              <p className="text-xs text-green-700 font-medium mb-2">Identity Verified</p>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">ID:</span> <span className="font-medium">{userDetails.idNumber}</span></p>
                <p><span className="text-gray-500">Name:</span> <span className="font-medium">{userDetails.name}</span></p>
              </div>
            </Card>

            {/* Terms */}
            <Card>
              <div className="text-xs text-gray-600 mb-3">
                <p className="font-medium mb-1">
                  <a href="/etims/auth/terms" className="text-[var(--kra-red)] underline hover:text-red-800">
                    Terms & Conditions
                  </a>
                </p>
                <p>By registering, you agree to use the eTIMS service in accordance with KRA guidelines. You confirm that the information provided is accurate and you are authorized to use this phone number for tax-related services.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 text-[var(--kra-red)]"
                />
                <span className="text-xs text-gray-700">
                  I accept the{' '}
                  <a href="/etims/auth/terms" className="text-[var(--kra-red)] underline hover:text-red-800">
                    Terms & Conditions
                  </a>
                </span>
              </label>
            </Card>

            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={handleProceedToOTP} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Sending OTP...</> : 'Continue'}
              </Button>
              <button onClick={() => setStep(1)} disabled={loading} className="w-full py-2 text-gray-600 text-xs font-medium disabled:text-gray-400">
                Edit Details
              </button>
            </div>
          </>
        ) : step === 3 ? (
          <>
            {/* OTP Verification */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-5 h-5 text-[var(--kra-red)]" />
                <span className="text-sm font-medium text-gray-700">Verify Your Phone</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Enter the OTP sent to <span className="font-medium">{phoneNumber}</span>
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="Enter OTP"
                className="w-full px-4 py-3 text-center text-xl tracking-widest border border-gray-300 rounded-lg"
                maxLength={6}
              />
            </Card>

            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={handleVerifyAndRegister} disabled={loading || otp.length < 4}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Verifying...</> : 'Continue'}
              </Button>
              <button 
                onClick={handleResendOTP} 
                disabled={loading} 
                className="w-full py-2 text-[var(--kra-red)] text-xs font-medium disabled:text-gray-400"
              >
                Resend OTP
              </button>
              <button 
                onClick={() => setStep(2)} 
                disabled={loading} 
                className="w-full py-2 text-gray-600 text-xs font-medium disabled:text-gray-400 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Go Back
              </button>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}

