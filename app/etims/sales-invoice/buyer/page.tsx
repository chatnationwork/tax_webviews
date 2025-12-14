'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Input, Button } from '../../_components/Layout';
import { saveSalesInvoice } from '../../_lib/store';
import { CheckCircle } from 'lucide-react';
import { lookupCustomer } from '../../../actions/etims';

export default function SalesInvoiceBuyer() {
  const router = useRouter();
  const [buyerPin, setBuyerPin] = useState('');
  const [buyerInfo, setBuyerInfo] = useState<{ pin: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    setError('');
    setLoading(true);
    
    try {
      const result = await lookupCustomer(buyerPin);
      if (result.success && result.customer) {
        setBuyerInfo({ pin: result.customer.pin, name: result.customer.name });
      } else {
        setError(result.error || 'Buyer not found. Please check the PIN/ID and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while validating buyer.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndContinue = () => {
    if (buyerInfo) {
      saveSalesInvoice({ buyer: buyerInfo });
      router.push('/etims/sales-invoice/details');
    }
  };

  const handleSkip = () => {
    saveSalesInvoice({ buyer: undefined });
    router.push('/etims/sales-invoice/details');
  };

  const handleEditBuyer = () => {
    setBuyerInfo(null);
    setBuyerPin('');
    setError('');
  };

  return (
    <Layout 
      title="Buyer Details" 
      step="Step 1 of 3"
      onBack={() => router.push('/etims')}
    >
      <div className="space-y-4">
        {!buyerInfo ? (
          <>
            <Card>
              <Input
                label="Buyer PIN / ID"
                value={buyerPin}
                onChange={setBuyerPin}
                placeholder="e.g. A001234567X"
                required
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </Card>

            <div className="space-y-3">
              <Button onClick={handleValidate} disabled={!buyerPin.trim() || loading}>
                {loading ? 'Validating...' : 'Validate Buyer'}
              </Button>
              <Button variant="secondary" onClick={handleSkip}>
                Skip Buyer Verification
              </Button>
            </div>
          </>
        ) : (
          <>
            <Card className="bg-green-50 border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-green-900 font-medium mb-2">Buyer Verified</h3>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-gray-600">Buyer Name:</span>{' '}
                      <span className="text-gray-900">{buyerInfo.name}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">Buyer PIN:</span>{' '}
                      <span className="text-gray-900">{buyerInfo.pin}</span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <Button onClick={handleConfirmAndContinue}>
                Confirm & Continue
              </Button>
              <Button variant="secondary" onClick={handleEditBuyer}>
                Edit Buyer Details
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
