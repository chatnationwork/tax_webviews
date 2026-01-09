'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button, Input } from '../../../_components/Layout';
import { PINOrIDInput } from '@/app/_components/KRAInputs';
import { saveSalesInvoice, getSalesInvoice } from '../../_lib/store';
import { Loader2, CheckCircle, Edit2 } from 'lucide-react';
import { lookupCustomer } from '../../../actions/etims';
import { useFlowTracking, trackFlowStarted } from '@/app/_components/PostHogProvider';

export default function SalesInvoiceBuyer() {
  const router = useRouter();
  
  // Track this step
  useFlowTracking('sales_invoice', 'buyer', 1);
  
  // Track flow start on first mount
  useEffect(() => {
    trackFlowStarted('sales_invoice');
  }, []);
  
  const [buyerPinOrId, setBuyerPinOrId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [isInputValid, setIsInputValid] = useState(false);
  const [inputType, setInputType] = useState<'pin' | 'id' | 'invalid' | 'empty'>('empty');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Validated buyer state
  const [validatedBuyer, setValidatedBuyer] = useState<{ pin: string; name: string } | null>(null);

  // Load previous buyer info if exists
  useEffect(() => {
    const saved = getSalesInvoice();
    if (saved?.buyer) {
      setValidatedBuyer(saved.buyer);
      setBuyerName(saved.buyer.name);
      setBuyerPinOrId(saved.buyer.pin);
    }
  }, []);

  const handleValidationChange = (isValid: boolean, type: 'pin' | 'id' | 'invalid' | 'empty') => {
    setIsInputValid(isValid);
    setInputType(type);
  };

  const handleValidate = async () => {
    setError('');
    
    // If no PIN/ID entered, skip validation and continue to items
    if (!buyerPinOrId.trim()) {
      saveSalesInvoice({ buyer: undefined });
      router.push('/etims/sales-invoice/details');
      return;
    }

    // If PIN/ID entered but not valid format, show error
    if (!isInputValid) {
      setError('Please enter a valid PIN (11 characters) or ID (6-8 digits)');
      return;
    }

    // Validate with API
    setLoading(true);
    
    try {
      const result = await lookupCustomer(buyerPinOrId.trim());
      
      if (result.success && result.customer) {
        const validatedName = result.customer.name;
        const enteredName = buyerName.trim();
        
        // Use validated name, or entered name if validation didn't return one
        const finalName = validatedName || enteredName || 'Verified Buyer';
        
        // Show preview instead of continuing
        setValidatedBuyer({
          pin: result.customer.pin,
          name: finalName
        });
      } else {
        setError(result.error || 'Could not verify this PIN/ID. Please check and try again.');
      }
    } catch (err: any) {
      setError('Unable to verify buyer details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setValidatedBuyer(null);
    setError('');
  };

  const handleConfirmAndContinue = () => {
    if (validatedBuyer) {
      saveSalesInvoice({ buyer: validatedBuyer });
      router.push('/etims/sales-invoice/details');
    }
  };

  const handleSkip = () => {
    if (buyerName.trim()) {
      saveSalesInvoice({ 
        buyer: {
          name: buyerName.trim(),
          pin: '' // Empty PIN for unverified buyer
        }
      });
    } else {
      saveSalesInvoice({ buyer: undefined });
    }
    router.push('/etims/sales-invoice/details');
  };

  return (
    <Layout 
      title="Buyer Details" 
      step="Step 1 of 3"
      onBack={() => router.push('/etims')}
    >
      <div className="space-y-4">
        {!validatedBuyer ? (
          <>
            {/* Input Form */}
            <Card>
              <div className="space-y-4">
                {/* Buyer PIN or ID Input with validation */}
                <PINOrIDInput
                  label="Buyer PIN or ID"
                  value={buyerPinOrId}
                  onChange={setBuyerPinOrId}
                  onValidationChange={handleValidationChange}
                  helperText="Enter PIN or ID"
                  required={false}
                />
                
                {/* Buyer Name Input */}
                <Input
                  label="Buyer Name"
                  value={buyerName}
                  onChange={setBuyerName}
                  placeholder="Enter buyer's name"
                />
              </div>
              
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              {buyerPinOrId.trim() ? (
                <Button onClick={handleValidate} disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Continue'
                  )}
                </Button>
              ) : (
                <Button onClick={handleSkip}>
                  Continue
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Validated Buyer Preview */}
            <Card className="bg-green-50 border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-green-900 font-medium mb-2 text-sm">Buyer Verified</h3>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-gray-600">Name:</span>{' '}
                      <span className="text-gray-900 font-medium">{validatedBuyer.name}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">PIN/ID:</span>{' '}
                      <span className="text-gray-900 font-mono">{validatedBuyer.pin}</span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button onClick={handleConfirmAndContinue}>
                Continue
              </Button>
              <Button variant="secondary" onClick={handleEdit}>
                <span className="flex items-center justify-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  Edit
                </span>
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
