'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Loader2, AlertCircle, Receipt } from 'lucide-react';
import { checkSession, getStoredPhone, makePayment } from '@/app/actions/payments';
import { taxpayerStore } from '../../_lib/store';
import { Layout, Card, Button, Input } from '../../../_components/Layout';

function EslipPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const phone = searchParams.get('phone') || '';
  
  const [prn, setPrn] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('');

  // Check session on mount
  useEffect(() => {
    const performSessionCheck = async () => {
      try {
        const hasSession = await checkSession();
        if (!hasSession) {
          const redirectUrl = `/payments/otp?redirect=${encodeURIComponent(pathname)}`;
          if (phone) {
            router.push(`${redirectUrl}&number=${encodeURIComponent(phone)}`);
          } else {
            router.push(redirectUrl);
          }
        } else {
          if (!phone) {
            const storedPhone = await getStoredPhone();
            if (storedPhone) {
              const redirectUrl = `${pathname}?phone=${encodeURIComponent(storedPhone)}`;
              router.replace(redirectUrl);
            } else {
              try {
                const localPhone = localStorage.getItem('phone_Number');
                if (localPhone) {
                  const redirectUrl = `${pathname}?phone=${encodeURIComponent(localPhone)}`;
                  router.replace(redirectUrl);
                  return;
                }
              } catch (e) {
                console.error('Error accessing local storage', e);
              }
              router.push(`/payments/otp?redirect=${encodeURIComponent(pathname)}`);
            }
          } else {
            setCheckingSession(false);
          }
        }
      } catch (err) {
        console.error('Session check failed', err);
        setCheckingSession(false);
      }
    };
    
    performSessionCheck();
  }, [pathname, phone, router]);

  const isPrnValid = prn.trim().length >= 5; // PRN should be at least 5 characters

  const handlePayment = async () => {
    setError('');
    setLoading(true);
    setPaymentStatus('');
    
    try {
      if (!phone) {
        throw new Error('Phone number is missing. Please re-verify via OTP.');
      }

      setPaymentStatus('Initiating payment...');
      
      const payRes = await makePayment(phone, prn.trim());
      
      if (payRes.success) {
        // Store for result page
        taxpayerStore.setPrn(prn.trim());
        if (payRes.checkoutUrl) taxpayerStore.setCheckoutUrl(payRes.checkoutUrl);
        taxpayerStore.setPaymentStatus('success', 'Payment initiated. Check your phone for the M-Pesa prompt.');
        
        setPaymentStatus('Payment initiated. Check your phone for M-Pesa prompt.');
        
        setTimeout(() => {
          router.push('/payments/eslip/result');
        }, 2000);
      } else {
        taxpayerStore.setPrn(prn.trim());
        if (payRes.checkoutUrl) taxpayerStore.setCheckoutUrl(payRes.checkoutUrl);
        taxpayerStore.setPaymentStatus('failed', payRes.message);
        setError(payRes.message || 'Payment initiation failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <Layout title="E-SLIP Payment" showHeader={false} showFooter={false}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="E-SLIP Payment" step="Enter PRN" showMenu>
      <div className="max-w-xl mx-auto space-y-6">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Receipt className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">Pay with PRN</h3>
              <p className="text-sm text-blue-700">
                Enter your Payment Reference Number (PRN) to complete your payment via M-Pesa.
              </p>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h2>
          
          <div className="space-y-4">
            <Input 
              label="Payment Reference Number (PRN)"
              value={prn}
              onChange={(val) => setPrn(val.toUpperCase())}
              placeholder="Enter your PRN"
              required
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {paymentStatus && !error && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{paymentStatus}</p>
              </div>
            )}

            <Button
              onClick={handlePayment}
              disabled={!isPrnValid || loading}
              className="w-full mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> {paymentStatus || 'Processing...'}</>
              ) : (
                'Pay Now'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default function EslipPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <EslipPaymentContent />
    </Suspense>
  );
}
