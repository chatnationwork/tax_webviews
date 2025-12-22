'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { saveBuyerInitiated } from '../../../_lib/store';
import { CheckCircle, Building2, User, Loader2, ArrowLeft } from 'lucide-react';
import { lookupCustomer } from '../../../../actions/etims';
import { PINOrIDInput } from '../../../../_components/KRAInputs';

export default function BuyerInitiatedCreate() {
  const router = useRouter();
  const [transactionType, setTransactionType] = useState<'b2b' | 'b2c'>('b2b');
  const [sellerPinOrId, setSellerPinOrId] = useState('');
  const [sellerInfo, setSellerInfo] = useState<{ pin: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerEmail, setSellerEmail] = useState('');

  const maskPin = (pin: string) => {
    if (pin.length <= 4) return pin;
    return pin.slice(0, 4) + '*'.repeat(pin.length - 4);
  };

  const maskName = (name: string) => {
    const parts = name.split(' ');
    return parts.map((part, idx) => {
      if (idx === 0) return part;
      if (part.length <= 2) return part;
      return part[0] + '*'.repeat(part.length - 1);
    }).join(' ');
  };

  const handleValidate = async () => {
    setError('');
    if (!sellerPinOrId.trim()) {
      setError('Please enter Seller PIN or ID');
      return;
    }
    if (transactionType === 'b2b' && !/^[A-Z]\d{9}[A-Z]$/i.test(sellerPinOrId.trim())) {
      setError('B2B transactions require a valid KRA PIN');
      return;
    }
    setLoading(true);
    try {
      const result = await lookupCustomer(sellerPinOrId.trim());
      if (result.success && result.customer) {
        setSellerInfo({ pin: result.customer.pin, name: result.customer.name });
        setShowDetailsForm(true);
      } else {
        setError(result.error || 'Seller not found');
      }
    } catch (err: any) {
      setError(err.message || 'Validation error');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToItems = () => {
    if (!sellerInfo) return;
    const cleanPhone = sellerPhone.trim().replace(/[^\d]/g, '');
    if (!cleanPhone || cleanPhone.length <= 9) {
      setError('Phone must be more than 9 digits');
      return;
    }
    saveBuyerInitiated({ 
      sellerName: sellerInfo.name, 
      sellerPin: sellerInfo.pin,
      sellerPhone: sellerPhone.trim(),
      sellerEmail: sellerEmail.trim() || undefined,
      transactionType
    });
    router.push('/etims/buyer-initiated/buyer/details');
  };

  const handleEditSeller = () => {
    setSellerInfo(null);
    setShowDetailsForm(false);
    setSellerPinOrId('');
    setSellerPhone('');
    setSellerEmail('');
    setError('');
  };

  return (
    <Layout 
      title="Create Invoice" 
      showHeader={false}
      onBack={() => router.push('/etims/buyer-initiated')}
    >
      <div className="space-y-3">
        {/* Helper Back Button */}
        <button onClick={() => router.push('/etims/buyer-initiated')} className="text-[var(--kra-red)] text-xs font-medium flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        {/* Header - KRA Dark */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">
            {!showDetailsForm ? 'Seller Validation' : 'Seller Details'}
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {!showDetailsForm ? 'Step 1/4 - Verify seller' : 'Step 2/4 - Contact info'}
          </p>
        </div>

        {!showDetailsForm ? (
          <>
            {/* Transaction Type */}
            <Card>
              <p className="text-xs text-gray-600 font-medium mb-2">Transaction Type</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTransactionType('b2b')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 text-sm font-medium ${
                    transactionType === 'b2b'
                      ? 'border-[var(--kra-red)] bg-red-50 text-[var(--kra-red)]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  B2B
                </button>
                <button
                  onClick={() => setTransactionType('b2c')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 text-sm font-medium ${
                    transactionType === 'b2c'
                      ? 'border-[var(--kra-red)] bg-red-50 text-[var(--kra-red)]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <User className="w-4 h-4" />
                  B2C
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                {transactionType === 'b2b' ? 'Requires seller KRA PIN' : 'Accepts PIN or ID'}
              </p>
            </Card>

            {/* Seller PIN/ID */}
            <Card>
              <PINOrIDInput
                label={transactionType === 'b2b' ? 'Seller PIN' : 'Seller PIN or ID'}
                value={sellerPinOrId}
                placeholder={transactionType === 'b2b' ? 'A012345678Z' : 'A012345678Z or 12345678'}
                onChange={setSellerPinOrId}
                onValidationChange={() => {}}
                helperText={transactionType === 'b2b' ? 'Enter valid PIN' : 'Enter valid PIN or ID'}
              />
            </Card>

            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <Button onClick={handleValidate} disabled={!sellerPinOrId.trim() || loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Validating...</> : 'Validate'}
            </Button>
          </>
        ) : sellerInfo && (
          <>
            {/* Verified Card */}
            <Card className="bg-green-50 border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 text-xs space-y-1">
                  <p className="text-green-800 font-medium">Seller Verified</p>
                  <p><span className="text-gray-500">PIN:</span> {maskPin(sellerInfo.pin)}</p>
                  <p><span className="text-gray-500">Name:</span> {maskName(sellerInfo.name)}</p>
                </div>
              </div>
            </Card>

            {/* Contact Info */}
            <Card>
              <p className="text-xs text-gray-600 font-medium mb-2">Contact Information</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    placeholder="+254..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email <span className="text-gray-400">(optional)</span></label>
                  <input
                    type="email"
                    value={sellerEmail}
                    onChange={(e) => setSellerEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </Card>

            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={handleContinueToItems}>Continue</Button>
              <Button variant="secondary" onClick={handleEditSeller}>Edit Seller</Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
