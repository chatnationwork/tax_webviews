'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../_components/Layout';
import { IDInput } from '../../../_components/KRAInputs';
import { YearOfBirthInput } from '../../../_components/YearOfBirthInput';
import { lookupById } from '../../../actions/etims';
import { Loader2 } from 'lucide-react';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('number') || '';
  
  const [step, setStep] = useState(1); // 1: ID input, 2: Preview, 3: OTP
  const [idNumber, setIdNumber] = useState('');
  const [yearOfBirth, setYearOfBirth] = useState('');
  const [userDetails, setUserDetails] = useState<{ idNumber: string; name: string; pin?: string } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isIdValid, setIsIdValid] = useState(false);
  const [isYearValid, setIsYearValid] = useState(false);

  const handleValidateId = async () => {
    setError('');
    if (!idNumber.trim()) { setError('Enter ID number'); return; }
    if (!/^\d{6,8}$/.test(idNumber.trim())) { setError('ID must be 6-8 digits'); return; }
    if (!yearOfBirth || yearOfBirth.length !== 4) { setError('Enter a valid year of birth'); return; }

    setLoading(true);
    try {
      // Pass year of birth to the lookup API (API will validate it)
      const result = await lookupById(idNumber.trim());
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

  const handleRegister = () => {
    if (!termsAccepted) { setError('Please accept terms & conditions'); return; }
    // Go to success page, which will then redirect to login
    const params = new URLSearchParams({
      phone: phoneNumber,
      name: userDetails?.name || '',
      pin: userDetails?.pin || ''
    });
    router.push(`/etims/auth/signup/success?${params.toString()}`);
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

  return (
    <Layout title="Sign Up" showHeader={false} showFooter={false} onBack={() => step === 1 ? router.push('/etims/auth') : setStep(1)}>
      <div className="space-y-4">
        {/* Logo */}
        <div className="flex justify-center py-2">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-12 w-auto" />
        </div>

        {/* Header */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">
            {step === 1 ? 'Sign Up' : 'Confirm Details'}
          </h1>
          <p className="text-gray-400 text-xs">
            {step === 1 ? 'Step 1/3 - Verify identity' : 'Step 2/3 - Review & accept'}
          </p>
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
        ) : userDetails && (
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
              <Button onClick={handleRegister}>Register</Button>
              <button onClick={() => setStep(1)} className="w-full py-2 text-gray-600 text-xs font-medium">
                Edit Details
              </button>
            </div>
          </>
        )}
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
