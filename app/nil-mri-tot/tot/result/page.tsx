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

export default function TotResultPage() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    
    const sendNotification = async () => {
      // Only send if success and not already sent
      if (!info.error && info.pin) {
         try {
           const phone = taxpayerStore.getMsisdn() || await getStoredPhone() || getKnownPhone();
           if (phone) {
             let message = `*Turnover Tax Return Filed Successfully*\n\nDear *${info.fullName}*,\nYour TOT Return for *${info.filingPeriod}* has been filed.\n\nTax Due: KES ${(info.taxAmount || 0).toLocaleString()}`;
             
             if (info.prn && info.paymentType !== 'file-and-pay') {
                message += `\n\nPayment Reference Number (PRN): *${info.prn}*`;
             }
             
             if (info.receiptNumber) {
                message += `\nReceipt Number: ${info.receiptNumber}`;
             } else if ((taxpayerStore as any).receiptNumber) {
                message += `\nReceipt Number: ${(taxpayerStore as any).receiptNumber}`;
             }

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
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  const handleReturnHome = () => {
    const phone = taxpayerStore.getMsisdn() || getKnownPhone();
    taxpayerStore.clear();
    router.push(`/?msisdn=${phone || ''}`);
  };

  return (
    <Layout title={taxpayerInfo?.error ? "Filing Error" : "Success"} showHeader={false}>
      <div className="space-y-4">
        {/* Success Card */}
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
                <h2 className="text-green-900 text-xl font-bold mb-4">Turnover Tax Return Submitted</h2>
                
                <div className="w-full text-left space-y-3 bg-white/60 p-4 rounded-lg border border-green-100">
                  <div className="flex justify-between items-start border-b border-green-100 pb-2">
                    <span className="text-sm text-gray-600">Taxpayer</span>
                    <span className="text-sm font-semibold text-gray-900 text-right">{taxpayerInfo?.fullName}</span>
                  </div>
                  
                  <div className="flex justify-between items-start border-b border-green-100 pb-2">
                     <span className="text-sm text-gray-600">Period</span>
                     <span className="text-sm font-semibold text-gray-900 text-right">{taxpayerInfo?.filingPeriod || 'N/A'}</span>
                  </div>
                  
                   <div className="flex justify-between items-start">
                     <span className="text-sm text-gray-600">Tax Due</span>
                     <span className="text-sm font-bold text-[var(--kra-red)] text-right">KES {(taxpayerInfo?.taxAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
  
                {/* PRN Display */}
                {taxpayerInfo?.prn && (
                  <div className="mt-4 block">
                      <div className="bg-yellow-50 px-4 py-3 rounded-lg border border-yellow-200">
                          <p className="text-xs text-yellow-800 uppercase font-bold mb-1">Payment Reference Number (PRN)</p>
                          <p className="text-xl font-mono text-gray-900 font-bold tracking-wider">{taxpayerInfo.prn}</p>
                          <p className="text-xs text-yellow-700 mt-2">Use this PRN to pay</p>
                      </div>
                  </div>
                )}
              </div>
  
              <p className="text-xs text-green-700 bg-green-100/50 px-4 py-2 rounded-full">
                Confirmation sent to whatsapp
              </p>
            </div>
          </Card>
        )}

        {/* WhatsApp Button */}
        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          
          <button 
            onClick={() => {
               const phone = taxpayerStore.getMsisdn() || getKnownPhone();
               router.push(`/nil-mri-tot/tot/validation${phone ? `?phone=${phone}` : ''}`);
            }}
            className="w-full py-3 text-white bg-[var(--kra-red)] hover:bg-red-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Turn Over Tax
          </button>

          <ResultActions journey="TOT Filing" />
        </div>

      </div>
    </Layout>
  );
}
