'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Layout, Card, Button } from '../../../_components/Layout';
import { WhatsAppButton, QuickMenu } from '../../../_components/QuickMenu';
import { ResultActions } from '../../../_components/ResultActions';
import { taxpayerStore } from '../../_lib/store';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { getStoredPhone, sendWhatsAppMessage } from '@/app/actions/nil-mri-tot';
import { getKnownPhone } from '@/app/_lib/session-store';
import { JourneyCompletionTracker } from './JourneyCompletionTracker';

export default function NilResultPage() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    
    const sendNotification = async () => {
      // Only send if success and not already sent (we can use a flag or just run once on mount)
      if (!info.error && info.pin) {
         try {
           const phone = taxpayerStore.getMsisdn() || await getStoredPhone() || getKnownPhone();
           if (phone) {
             const baseMessage = info.successMessage || 'Successfully Filled NIL Return';
             const receipt = (taxpayerStore as any).receiptNumber || 'N/A';
             const taxDue = info.taxAmount !== undefined ? info.taxAmount : 0;
             
             const message = `${baseMessage}\n\nKRA Account Number: ${receipt}\nTax Due: KES ${taxDue}`;
             
             await sendWhatsAppMessage({
               recipientPhone: phone,
               message: message
             });
           }
         } catch (err) {
           console.error('Failed to send WhatsApp notification', err);
         }
      }
    };

    if (!mounted) {
       setMounted(true);
       sendNotification();
    }
  }, [mounted]); // Run once when mounted state changes implies initial load handling

  if (!mounted) {
    return null;
  }

  const handleReturnHome = async () => {
    const phone = taxpayerStore.getMsisdn() || getKnownPhone();
    taxpayerStore.clear();
    router.push(`/?msisdn=${phone || ''}`);
  };

  return (
    <Layout title={taxpayerInfo?.error ? "Filing Error" : "Success"} showHeader={false}>
      <div className="space-y-4">
        {/* Success/Error Card */}
        {taxpayerInfo?.error ? (
           <Card className="bg-red-50 border-red-200 text-center py-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center shadow-sm">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              
              <div>
                <h2 className="text-red-900 text-xl font-bold mb-2">Filing Failed</h2>
                <p className="text-sm text-red-800 px-4">
                  {taxpayerInfo.error}
                </p>
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
                <h2 className="text-green-900 text-xl font-bold mb-2">Filing Successful!</h2>
                <p className="text-sm text-green-800 px-4">
                  Your <span className="font-semibold">{taxpayerInfo?.selectedNilType?.toUpperCase()} NIL return</span> for {taxpayerInfo?.fullName} has been filed.
                </p>
                
                {/* Receipt Number Display if available */}
                {(taxpayerStore as any).receiptNumber && (
                  <div className="mt-4 bg-white/60 px-4 py-2 rounded-lg inline-block border border-green-200">
                    <p className="text-xs text-green-600 uppercase font-semibold">Receipt Number</p>
                    <p className="text-lg font-mono text-green-800">{(taxpayerStore as any).receiptNumber}</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-blue-800 bg-blue-100/50 px-4 py-2 rounded-full mt-4">
                Confirmation sent to your registered number
              </p>
            </div>
          </Card>
        )}

        {/* Journey Completion Tracking */}
        <JourneyCompletionTracker success={!taxpayerInfo?.error} />


        {/* WhatsApp Button */}
        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          
          <button 
            onClick={() => {
               const phone = taxpayerStore.getMsisdn() || getKnownPhone();
               router.push(`/nil-mri-tot/nil/validation${phone ? `?phone=${phone}` : ''}`);
            }}
            className="w-full py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors border border-blue-200"
          >
            File Another Return
          </button>

          <ResultActions journey="NIL Filing" />
        </div>
      </div>
    </Layout>
  );
}
