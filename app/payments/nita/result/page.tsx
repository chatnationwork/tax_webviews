'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';
import { Layout, Card, Button, IdentityStrip } from '../../../_components/Layout';

export default function NitaResultPage() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
  }, []);

  if (!mounted || !taxpayerInfo) {
    return null;
  }

  const isSuccess = taxpayerInfo.paymentStatus === 'success';
  const prn = taxpayerInfo.prn;
  const checkoutUrl = taxpayerInfo.checkoutUrl;

  const handleCopyPrn = async () => {
    if (prn) {
      await navigator.clipboard.writeText(prn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNewPayment = () => {
    taxpayerStore.clear();
    router.push('/');
  };

  const handleRetry = () => {
    router.push('/payments/nita/payment');
  };

  const handlePayOnline = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
    }
  };

  return (
    <Layout title="NITA Payments" step="Payment Result" showMenu>
      <div className="space-y-6">
        {/* Result Card */}
        <Card className={`p-6 text-center ${isSuccess ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex justify-center mb-4">
            {isSuccess ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            )}
          </div>
          
          <h2 className={`text-xl font-bold mb-2 ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
            {isSuccess ? 'Payment Initiated!' : 'Payment Failed'}
          </h2>
          
          <p className={`text-sm ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
            {taxpayerInfo.paymentMessage || (isSuccess ? 'Check your phone for the M-Pesa prompt.' : 'Something went wrong. Please try again.')}
          </p>
        </Card>

        {/* PRN Display */}
        {prn && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Payment Reference Number</h3>
            <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
              <span className="font-mono text-lg font-bold text-[var(--kra-red)]">{prn}</span>
              <button
                onClick={handleCopyPrn}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Copy PRN"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Keep this number for your records. You can use it to track your payment.
            </p>
          </Card>
        )}

        {/* Online Payment Fallback */}
        {checkoutUrl && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Alternative Payment Option</h3>
            <p className="text-xs text-blue-700 mb-3">
              {"Didn't receive M-Pesa prompt or want to pay with a different method?"}
            </p>
            <button
              onClick={handlePayOnline}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Pay Online
            </button>
          </Card>
        )}

        {/* Payment Details */}
        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Payment Summary</h3>
          <IdentityStrip label="Taxpayer" value={taxpayerInfo.fullName || taxpayerInfo.pin} />
          <IdentityStrip label="PIN" value={taxpayerInfo.pin} />
          {taxpayerInfo.taxPeriodFrom && (
            <IdentityStrip label="Period From" value={taxpayerInfo.taxPeriodFrom} />
          )}
          {taxpayerInfo.taxPeriodTo && (
            <IdentityStrip label="Period To" value={taxpayerInfo.taxPeriodTo} />
          )}
          {taxpayerInfo.amount && (
            <IdentityStrip label="Amount" value={`KES ${taxpayerInfo.amount.toLocaleString()}`} />
          )}
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {!isSuccess && (
            <Button
              onClick={handleRetry}
              className="w-full bg-[var(--kra-red)] hover:bg-red-700"
            >
              Try Again
            </Button>
          )}
          
          <Button
            onClick={handleNewPayment}
            variant="secondary"
            className="w-full"
          >
            Make New Payment
          </Button>
        </div>
      </div>
    </Layout>
  );
}
