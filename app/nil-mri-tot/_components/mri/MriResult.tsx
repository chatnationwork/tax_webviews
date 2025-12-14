'use client';
import { useRouter } from 'next/navigation';
import { CheckCircle, MessageCircle, Receipt } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';

export function MriResult() {
  const router = useRouter();
  const taxpayerInfo = taxpayerStore.getTaxpayerInfo();

  if (!taxpayerInfo.rentalIncome) {
    router.push('/nil-mri-tot/mri/validation');
    return null;
  }

  const mriTax = (taxpayerInfo.rentalIncome * 0.1).toFixed(2);
  const isPayment = taxpayerInfo.paymentType === 'file-and-pay';

  const handleReturnHome = () => {
    taxpayerStore.clear();
    router.push('/nil-mri-tot');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="text-green-900 mb-4">
              {isPayment ? 'MRI Return Filed & Payment Successful!' : 'MRI Return Filed Successfully!'}
            </h1>

            <p className="text-gray-700">
              Your MRI return for {taxpayerInfo.fullName} has been filed successfully.
            </p>
          </div>

          <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg mb-6">
            <h3 className="text-purple-900 mb-4">Return Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Rental Income:</span>
                <span className="text-gray-900">KES {taxpayerInfo.rentalIncome.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">MRI Tax (10%):</span>
                <span className="text-gray-900">KES {mriTax}</span>
              </div>
              {isPayment && (
                <div className="flex justify-between pt-3 border-t border-purple-200">
                  <span className="text-purple-900">Amount Paid:</span>
                  <span className="text-purple-900">KES {mriTax}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6 flex items-center gap-3">
            {isPayment ? (
              <>
                <Receipt className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <p className="text-blue-800">WhatsApp payment receipt sent to your registered number</p>
              </>
            ) : (
              <>
                <MessageCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <p className="text-blue-800">WhatsApp confirmation sent to your registered number</p>
              </>
            )}
          </div>

          <button
            onClick={handleReturnHome}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
