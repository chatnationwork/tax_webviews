'use client';
import { useRouter } from 'next/navigation';
import { CheckCircle, MessageCircle, AlertCircle } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';
import { WhatsAppButton } from '../../../_components/QuickMenu';

import { getStoredPhone, sendWhatsAppMessage } from '@/app/actions/nil-mri-tot';
import { useState, useEffect } from 'react';

export default function MriResultPage() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    
    // Redirect if no data (handled in separate effect or logic, but keeping existing check)
    if (!info.rentalIncome && typeof window !== "undefined") {
       router.push('/nil-mri-tot/mri/validation');
       return;
    }

    const sendNotification = async () => {
      // Only send if success and not already sent
      if (!info.error && info.pin) {
         try {
           const phone = taxpayerStore.getMsisdn() || await getStoredPhone() || localStorage.getItem('phone_Number');
           if (phone) {
             const mriTax = ((info.rentalIncome || 0) * 0.1).toFixed(2);
             let message = `*MRI Return Filed Successfully*\n\nDear *${info.fullName}*,\nYour Monthly Rental Income Return for *${info.filingPeriod}* has been filed.\n\nTax Due: KES ${mriTax}`;
             
             if (info.prn && info.paymentType !== 'file-and-pay') {
                message += `\n\nPayment Reference Number (PRN): *${info.prn}*\nPlease pay via M-Pesa Paybill 222222, Account: ${info.prn}`;
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
  }, [mounted, router]);

  if (!mounted || !taxpayerInfo) {
    return null;
  }

  const mriTax = (taxpayerInfo.rentalIncome * 0.1).toFixed(2);
  const isPayment = taxpayerInfo.paymentType === 'file-and-pay';

  const handleReturnHome = () => {
    const phone = taxpayerStore.getMsisdn() || localStorage.getItem('phone_Number');
    taxpayerStore.clear();
    router.push(`/?msisdn=${phone || ''}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl p-8 shadow-lg">
          
          {taxpayerInfo.error ? (
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-red-900 mb-4 text-xl font-bold">Filing Failed</h1>
                <p className="text-red-800 bg-red-50 p-4 rounded-lg border border-red-200 text-sm">
                  {taxpayerInfo.error}
                </p>
            </div>
          ) : (
             <>
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>

                    <h1 className="text-green-900 text-xl font-bold mb-2">
                    Monthly Rental Income Return Submitted Successfully
                    </h1>
                </div>

                <div className="p-6 bg-green-50 border border-green-200 rounded-lg mb-6">
                    <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Taxpayer:</span>
                        <span className="text-gray-900 font-semibold text-right">{taxpayerInfo.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Period:</span>
                        <span className="text-gray-900 font-semibold">{taxpayerInfo.filingPeriod || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-green-200">
                        <span className="text-gray-900 font-bold">Tax Due:</span>
                        <span className="text-[var(--kra-red)] font-bold">KES {mriTax}</span>
                    </div>
                    {isPayment && (
                        <div className="flex justify-between">
                        <span className="text-green-800">Amount Paid:</span>
                        <span className="text-green-800 font-bold">KES {mriTax}</span>
                        </div>
                    )}
                    </div>
                </div>

                {/* PRN Display for File Only */}
                {taxpayerInfo.prn && !isPayment && (
                     <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6 text-center">
                        <p className="text-xs text-yellow-800 uppercase font-bold mb-1">Payment Reference Number (PRN)</p>
                        <p className="text-xl font-mono text-gray-900 font-bold tracking-wider">{taxpayerInfo.prn}</p>
                        <p className="text-sm text-yellow-700 mt-2">Please pay KES {mriTax} using this PRN</p>
                     </div>
                )}
             </>
          )}


          {!taxpayerInfo.error && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6 flex items-center gap-3">
               
                    <MessageCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                    <p className="text-blue-800">WhatsApp confirmation sent to your number</p>
              
            </div>
          )}

          {/* WhatsApp Button */}
          <WhatsAppButton label={taxpayerInfo.error ? "Back to WhatsApp" : "Open in Whatsapp"} />

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                const phone = taxpayerStore.getMsisdn() || localStorage.getItem('phone_Number');
                router.push(`/nil-mri-tot/mri/validation${phone ? `?phone=${phone}` : ''}`);
              }}
              className="w-full py-3 text-white bg-[var(--kra-red)] hover:bg-red-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Rental Income
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
