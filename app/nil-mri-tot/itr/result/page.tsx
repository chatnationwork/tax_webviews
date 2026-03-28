'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useRef } from 'react';
import { Layout, Card } from '../../../_components/Layout';
import { ResultActions } from '../../../_components/ResultActions';
import { taxpayerStore } from '../../_lib/store';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { getStoredPhone, sendWhatsAppMessage, renderItrFilingCard, sendWhatsAppImage } from '@/app/actions/nil-mri-tot';
import { getKnownPhone } from '@/app/_lib/session-store';
import { JourneyCompletionTracker } from '../../nil/result/JourneyCompletionTracker';

function ItrResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const notificationSentRef = useRef(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);

    if (notificationSentRef.current) return;
    notificationSentRef.current = true;

    const sendNotification = async () => {
      const itr = taxpayerStore.getItrData();
      if (!itr.error && info.pin) {
        try {
          const recipientPhone = taxpayerStore.getMsisdn() || await getStoredPhone() || getKnownPhone();
          if (recipientPhone) {
            const taxDue = Number(itr.taxComputation?.taxRefundDue || 0).toLocaleString('en-KE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const message = `Dear ${info.fullName || 'Taxpayer'},\n\nYour Income Tax Return has been filed successfully.\n\nPIN: ${info.pin}\nReceipt: ${itr.receiptNumber || 'N/A'}\nFiling Period: ${itr.filingPeriod}\nTax Due: KES ${taxDue}\n\nPlease keep this for your records.`;

            // 1. Generate Hypecard URL
            const filingCard = await renderItrFilingCard({
              name: info.fullName || 'Taxpayer',
              pin: info.pin,
            });

            if (filingCard && 'url' in filingCard && filingCard.url) {
              // 2. Send as Image message with caption
              await sendWhatsAppImage({
                recipientPhone,
                imageUrl: filingCard.url,
                caption: message
              });
            } else {
              // Fallback to text if card generation failed
              await sendWhatsAppMessage({ recipientPhone, message });
            }

            setWhatsAppSent(true);
          }
        } catch (err) {
          console.error('Failed to send WhatsApp notification', err);
        }
      }
    };

    sendNotification();
  }, []);

  if (!mounted) return null;

  const itrData = taxpayerStore.getItrData();

  const handleReturnHome = async () => {
    const msisdn = taxpayerStore.getMsisdn() || getKnownPhone();
    taxpayerStore.clear();
    router.push(`/?msisdn=${msisdn || ''}`);
  };

  const validationHref = `/nil-mri-tot/itr/validation${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`;

  return (
    <Layout title={itrData.error ? 'Filing Error' : 'Success'} showHeader={false}>
      <div className="space-y-4">
        {itrData.error ? (
          <Card className="bg-red-50 border-red-200 text-center py-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center shadow-sm">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h2 className="text-red-900 text-xl font-bold mb-2">Filing Failed</h2>
                <p className="text-sm text-red-800 px-4">{itrData.error}</p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-green-50 border-green-200 text-center py-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center shadow-sm">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-green-900 text-xl font-bold mb-2">ITR Filing Successful!</h2>
                <p className="text-sm text-green-800 px-4">
                  Your Individual Income Tax Return for {taxpayerInfo?.fullName} has been filed.
                </p>
                {itrData.receiptNumber ? (
                  <div className="mt-4 bg-white/60 px-4 py-2 rounded-lg inline-block border border-green-200">
                    <p className="text-xs text-green-600 uppercase font-semibold">Receipt Number</p>
                    <p className="text-lg font-mono text-green-800">{itrData.receiptNumber}</p>
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-blue-800 bg-blue-100/50 px-4 py-2 rounded-full mt-4">
                {whatsAppSent ? '✓ Confirmation sent to your registered number' : 'Sending confirmation...'}
              </p>
            </div>
          </Card>
        )}

        <JourneyCompletionTracker success={!itrData.error} />

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => {
              taxpayerStore.clearItr();
              router.push(validationHref);
            }}
            className="w-full py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors border border-blue-200"
          >
            File Another Return
          </button>

          <ResultActions journey="ITR" />
        </div>
      </div>
    </Layout>
  );
}

export default function ItrResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>}>
      <ItrResultContent />
    </Suspense>
  );
}
