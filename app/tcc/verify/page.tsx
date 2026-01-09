'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Layout, IdentityStrip, Button, Select, Card } from '../../_components/Layout';
import { taxpayerStore } from '../_lib/store';
import { TCC_REASONS, TccReasonKey } from '../_lib/tcc-constants';
import { guiLookup, submitTccApplication } from '@/app/actions/tcc';
import { Loader2, AlertCircle } from 'lucide-react';

export default function TccVerifyPage() {
  const router = useRouter();
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Form State
  const [selectedReason, setSelectedReason] = useState<TccReasonKey | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize
  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    if (!info.idNumber) {
      router.push('/tcc/validation');
    }
  }, [router]);

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a reason for application');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 1. GUI Lookup for verification
      const guiResult = await guiLookup(taxpayerInfo.idNumber);
      
      if (!guiResult.success) {
        setError(guiResult.error || 'Taxpayer verification failed');
        setLoading(false);
        return;
      }

      // 2. Submit TCC Application
      const result = await submitTccApplication(
        taxpayerInfo.pin,
        selectedReason as TccReasonKey
      );

      if (result.success) {
        // Store the result
        taxpayerStore.setTccApplication(
          TCC_REASONS[selectedReason as TccReasonKey],
          result.tccNumber,
          result.status
        );
        
        router.push('/tcc/result');
      } else {
        setError(result.error || 'Failed to submit TCC application');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
     router.push('/tcc/validation');
  };

  if (!mounted || !taxpayerInfo?.idNumber) {
    return null;
  }

  // Build reason options from TCC_REASONS
  const reasonOptions = Object.entries(TCC_REASONS).map(([key, label]) => ({
    value: key,
    label: label,
  }));

  return (
    <Layout title="TCC Application" onBack={handleBack}>
      <div className="space-y-6">
         {/* Header Card */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white shadow-lg">
          <h1 className="text-lg font-bold mb-1">Tax Compliance Certificate</h1>
          <p className="text-gray-300 text-xs">Step 2/3 - Application Details</p>
        </div>

         {/* Identity & Details Card */}
         <Card className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-2">Taxpayer Details</h2>
              <div className="space-y-1">
                <IdentityStrip label="Name" value={taxpayerInfo.fullName} />
                <IdentityStrip label="ID Number" value={taxpayerInfo.idNumber} />
                <IdentityStrip label="PIN" value={taxpayerInfo.pin} />
              </div>
               <button 
                onClick={handleBack}
                className="text-[var(--kra-red)] text-xs font-medium mt-2 hover:underline text-left block"
              >
                Not your details? Go back
              </button>
            </div>
         </Card>

         {/* Reason Selection */}
         <Card className="p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Reasons for Application</h2>
            <p className="text-xs text-gray-500">Choose reason for application</p>
            
            <Select
              label="Application Reason"
              options={reasonOptions}
              value={selectedReason}
              onChange={(val) => setSelectedReason(val as TccReasonKey | '')}
              required
            />
          </Card>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button 
              onClick={handleSubmit}
              disabled={loading || !selectedReason}
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Continue
            </Button>
          </div>
      </div>
    </Layout>
  );
}
