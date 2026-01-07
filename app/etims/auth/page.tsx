'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../_components/Layout';
import { checkUserStatus } from '../../actions/etims';
import { saveUserSession } from '../_lib/store';
import { Loader2, Phone } from 'lucide-react';

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('number') || '';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckStatus = async (msisdn: string) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await checkUserStatus(msisdn);
      
      if (!result.success) {
        setError(result.error || 'Failed to check status');
        setLoading(false);
        return;
      }

      // Save session with the phone number
      saveUserSession({ msisdn, name: result.name });

      if (result.isRegistered) {
        // User is registered - go to OTP verification
        const params = new URLSearchParams({
          number: msisdn,
          name: result.name || '',
          pin: result.pin || ''
        });
        router.push(`/etims/auth/login?${params.toString()}`);
      } else {
        // User not registered - check if they are eligible for eTIMS
        if (result.hasVat) {
          setError('You are not eligible for eTIMS registration. VAT-registered taxpayers cannot use the eTIMS USSD service.');
          setLoading(false);
          return;
        }
        // User is eligible - go to signup
        router.push(`/etims/auth/signup?number=${encodeURIComponent(msisdn)}`);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError('Phone number is missing from URL');
      return;
    }
    handleCheckStatus(phoneNumber);
  };

  return (
    <Layout title="eTIMS" showHeader={false} showFooter={false}>
      <div className="min-h-[80vh] flex flex-col justify-between space-y-4 py-6">
        {/* Main Content */}
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="flex justify-center mb-3">
              <img src="/kra_logo.png" alt="KRA Logo" className="h-24 w-auto" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">eTIMS Service</h1>
            <p className="text-sm text-gray-500">Kenya Revenue Authority</p>
          </div>

          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading || !phoneNumber.trim()}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Checking...</>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>
          </Card>

          {/* Login Info Text */}
          <p className="text-center text-sm text-gray-600 font-medium">
            Secure access to your eTIMS services
          </p>

          {/* KRA Image */}
          <div className="flex justify-center">
            <img src="/kra30.jpg" alt="KRA eTIMS" className="w-full max-w-sm rounded-lg shadow-md" />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="grid grid-cols-2 gap-2 pt-4">
          <button 
            onClick={() => {
              const message = encodeURIComponent('Main menu');
              window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
            }}
            className="flex flex-col items-center justify-center gap-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium text-xs"
          >
            Go Main Menu
          </button>
          <button 
            onClick={() => {
              const message = encodeURIComponent('Connect to agent');
              window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
            }}
            className="flex flex-col items-center justify-center gap-1 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium text-xs"
          >
            Connect to an Agent
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <AuthContent />
    </Suspense>
  );
}
