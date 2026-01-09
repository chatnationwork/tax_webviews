'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { checkSession, getStoredPhone, generateAhlPayment, makePayment, sendWhatsAppMessage } from '@/app/actions/payments';
import { taxpayerStore } from '../../_lib/store';
import { Layout, Card, Button, Input } from '../../../_components/Layout';
import { PINInput } from '@/app/_components/KRAInputs';

function AhlPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const phoneFromUrl = searchParams.get('phone') || '';
  
  // Form state
  const [pin, setPin] = useState('');
  const [isPinValid, setIsPinValid] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [taxPeriodFrom, setTaxPeriodFrom] = useState('');
  const [taxPeriodTo, setTaxPeriodTo] = useState('');
  const [amount, setAmount] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [prn, setPrn] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // Check session and prefill phone on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const hasSession = await checkSession();
        if (!hasSession) {
          const redirectUrl = `/payments/otp?redirect=${encodeURIComponent(pathname)}`;
          if (phoneFromUrl) {
            router.push(`${redirectUrl}&number=${encodeURIComponent(phoneFromUrl)}`);
          } else {
            router.push(redirectUrl);
          }
          return;
        }

        // Prefill phone number
        if (phoneFromUrl) {
          setPhoneNumber(phoneFromUrl);
        } else {
          const storedPhone = await getStoredPhone();
          if (storedPhone) {
            setPhoneNumber(storedPhone);
          }
        }
        
        setCheckingSession(false);
      } catch (err) {
        console.error('Session check failed', err);
        setCheckingSession(false);
      }
    };
    
    initialize();
  }, [pathname, phoneFromUrl, router]);

  // Format phone number for API (ensure 254 prefix)
  const formatPhoneForApi = (phone: string): string => {
    let cleanNumber = phone.trim().replace(/[^\d]/g, '');
    if (cleanNumber.startsWith('0')) cleanNumber = '254' + cleanNumber.substring(1);
    else if (!cleanNumber.startsWith('254')) cleanNumber = '254' + cleanNumber;
    return cleanNumber;
  };

  // Convert date to DD-MM-YYYY format for API
  const formatDateForApi = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const isPhoneValid = phoneNumber.replace(/\D/g, '').length >= 9;
  const isDateValid = taxPeriodFrom && taxPeriodTo && new Date(taxPeriodFrom) <= new Date(taxPeriodTo);
  const isFormValid = isPinValid && isPhoneValid && isDateValid && amount;

  // Real-time date validation
  useEffect(() => {
    if (taxPeriodFrom && taxPeriodTo) {
      if (new Date(taxPeriodFrom) > new Date(taxPeriodTo)) {
        setDateError('Tax Period From must be earlier than or equal to Tax Period To');
      } else {
        setDateError('');
      }
    } else {
      setDateError('');
    }
  }, [taxPeriodFrom, taxPeriodTo]);

  const handlePayment = async () => {
    if (!isFormValid) {
      if (taxPeriodFrom && taxPeriodTo && new Date(taxPeriodFrom) > new Date(taxPeriodTo)) {
        setError('Tax Period From must be earlier than Tax Period To.');
      } else {
        setError('Please fill in all required fields correctly.');
      }
      return;
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    setError('');
    setPaymentStatus('');
    setPrn('');

    try {
      // 1. Generate PRN
      setPaymentStatus('Generating PRN...');
      
      const prnRes = await generateAhlPayment(
        pin.trim().toUpperCase(),
        formatDateForApi(taxPeriodFrom),
        formatDateForApi(taxPeriodTo),
        amount
      );

      if (!prnRes.success || !prnRes.prn) {
        setError(prnRes.message || 'Failed to generate PRN');
        setLoading(false);
        return;
      }

      setPrn(prnRes.prn);
      setPaymentStatus('PRN Generated. Sending notification...');

      // Send WhatsApp notification with PRN
      const formattedPhone = formatPhoneForApi(phoneNumber);
      const whatsappMessage = `🏠 *AHL Payment PRN Generated*\n\n` +
        `PRN: *${prnRes.prn}*\n` +
        `Amount: KES ${Number(amount).toLocaleString()}\n` +
        `Tax Period: ${taxPeriodFrom} to ${taxPeriodTo}\n\n` +
        `Please complete your M-Pesa payment or use the online checkout link.`;
      
      await sendWhatsAppMessage({
        recipientPhone: formattedPhone,
        message: whatsappMessage
      });

      setPaymentStatus('Initiating payment...');

      // 2. Make Payment
      const payRes = await makePayment(formattedPhone, prnRes.prn);
      
      if (payRes.success) {
        // Store payment details for result page
        taxpayerStore.setTaxpayerInfo('', 0, '', pin.trim().toUpperCase());
        taxpayerStore.setPaymentDetails(taxPeriodFrom, taxPeriodTo, amountNum);
        taxpayerStore.setPrn(prnRes.prn);
        if (payRes.checkoutUrl) taxpayerStore.setCheckoutUrl(payRes.checkoutUrl);
        taxpayerStore.setPaymentStatus('success', 'Payment initiated. Check your phone for the M-Pesa prompt.');
        
        setPaymentStatus('Payment initiated. Check your phone for M-Pesa prompt.');
        
        setTimeout(() => {
          router.push('/payments/ahl/result');
        }, 2000);
      } else {
        taxpayerStore.setPrn(prnRes.prn);
        if (payRes.checkoutUrl) taxpayerStore.setCheckoutUrl(payRes.checkoutUrl);
        taxpayerStore.setPaymentStatus('failed', payRes.message);
        setError(`PRN generated (${prnRes.prn}), but payment failed: ${payRes.message}`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while processing payment');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <Layout title="AHL Payments" showHeader={false} showFooter={false}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="AHL Payments" showMenu>
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h2>
          
          <div className="space-y-4">
            <PINInput
              label="KRA PIN"
              value={pin}
              onChange={setPin}
              onValidationChange={setIsPinValid}
              helperText="PIN must be exactly 11 characters (e.g., A012345678Z)"
            />

            <Input 
              label="Mobile Number (for M-Pesa)"
              value={phoneNumber}
              onChange={(val) => setPhoneNumber(val.replace(/[^\d+]/g, ''))}
              placeholder="e.g., 0712345678"
              type="tel"
              required
            />
            <p className="text-xs text-gray-500 -mt-2">Number that will receive M-Pesa prompt</p>

            <div>
              <label className="block text-xs text-gray-600 mb-1 font-medium">
                Tax Period From <span className="text-[var(--kra-red)]">*</span>
              </label>
              <input
                type="date"
                value={taxPeriodFrom}
                onChange={(e) => setTaxPeriodFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--kra-red)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1 font-medium">
                Tax Period To <span className="text-[var(--kra-red)]">*</span>
              </label>
              <input
                type="date"
                value={taxPeriodTo}
                onChange={(e) => setTaxPeriodTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--kra-red)] focus:border-transparent"
              />
            </div>

            <Input
              label="Amount (KES)"
              value={amount}
              onChange={setAmount}
              type="number"
              placeholder="Enter amount"
              required
            />

            {(error || dateError) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-600">{error || dateError}</p>
              </div>
            )}

            {prn && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-bold text-green-700">PRN Generated: {prn}</p>
                {paymentStatus && <p className="text-sm text-green-600">{paymentStatus}</p>}
              </div>
            )}

            <Button
              onClick={handlePayment}
              disabled={!isFormValid || loading}
              className="w-full mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />{paymentStatus || 'Processing...'}</>
              ) : (
                'Pay'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default function AhlPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <AhlPaymentContent />
    </Suspense>
  );
}
