'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Layout, Button, Select, Card } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { Loader2, AlertCircle } from 'lucide-react';
import { fileNilReturn, getFilingPeriods, getTaxpayerObligations, getStoredPhone } from '@/app/actions/nil-mri-tot';

function NilVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  
  // Selection State
  const [obligations, setObligations] = useState<any[]>([]);
  const [loadingObligations, setLoadingObligations] = useState(false);
  const [selectedObligation, setSelectedObligation] = useState('');
  const [filingPeriod, setFilingPeriod] = useState('');
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  
  // Filing State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    if (!info.idNumber) {
      router.push('/nil-mri-tot/nil/validation');
    }
  }, [router]);

  // Fetch obligations
  useEffect(() => {
    if (!taxpayerInfo?.pin) return;

    const fetchObligations = async () => {
      setLoadingObligations(true);
      try {
        const result = await getTaxpayerObligations(taxpayerInfo.pin);
        if (result.success && result.obligations) {
        
          const allowedNilObligations = ['Income Tax', 'MRI', 'VAT', 'PAYE'];
          
          const formattedObligations = result.obligations
            .filter(obs => allowedNilObligations.some(allowed => 
              obs.obligationName.toLowerCase().includes(allowed.toLowerCase())
            ))
            .map(obs => ({
              value: obs.obligationId, 
              label: obs.obligationName,
              obligationId: obs.obligationId
            }));
          setObligations(formattedObligations);
        }
      } catch (err) {
        console.error("Failed to fetch obligations", err);
      } finally {
        setLoadingObligations(false);
      }
    };

    fetchObligations();
  }, [taxpayerInfo?.pin]);

  // Fetch filing period when obligation changes
  useEffect(() => {
    if (!selectedObligation || !taxpayerInfo?.pin) {
      setFilingPeriod('');
      return;
    }

    const fetchPeriod = async () => {
      setLoadingPeriod(true);
      setError('');
      try {
        // selectedObligation is the ID now
        const obligationId = selectedObligation; 
        
        const result = await getFilingPeriods(taxpayerInfo.pin, obligationId);


        
        if (result.success && result.periods && result.periods.length > 0) {
          // Take the first available period
          setFilingPeriod(result.periods[0]);
        } else {
          setFilingPeriod(''); // or handle "No periods found"
          // Maybe show a warning if no periods found?
        }
      } catch (err) {
        console.error("Failed to fetch period", err);
      } finally {
        setLoadingPeriod(false);
      }
    };

    fetchPeriod();
  }, [selectedObligation, taxpayerInfo?.pin]);


  if (!mounted || !taxpayerInfo?.idNumber) {
    return null;
  }

  const handleFileReturn = async () => {
    if (!selectedObligation || !filingPeriod) return;
    
    setLoading(true);
    setError('');
    
    try {
      // selectedObligation is serving as the obligation ID in the new dynamic list
      const obligationId = selectedObligation;

      const result = await fileNilReturn(
        taxpayerInfo.pin,
        obligationId,
        filingPeriod
      );

      if (result.success) {
        taxpayerStore.setSelectedNilType(selectedObligation);
        try {
          // @ts-ignore
          taxpayerStore.receiptNumber = result.receiptNumber; 
        } catch (e) {}
        router.push('/nil-mri-tot/nil/result');
      } else {
        setError(result.message || 'Failed to file NIL return');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while filing the return');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    if (phone) {
       router.push(`/nil-mri-tot/nil/validation?phone=${encodeURIComponent(phone)}`);
       return;
    }
    const storedPhone = await getStoredPhone();
    if (storedPhone) {
      router.push(`/nil-mri-tot/nil/validation?phone=${encodeURIComponent(storedPhone)}`);
    } else {
       try {
          const localPhone = localStorage.getItem('phone_Number');
          if (localPhone) {
             router.push(`/nil-mri-tot/nil/validation?phone=${encodeURIComponent(localPhone)}`);
          } else {
             router.push('/nil-mri-tot/nil/validation');
          }
       } catch (e) {
          router.push('/nil-mri-tot/nil/validation');
       }
    }
  };

  return (
    <Layout title="Back to Taxpayer Validation" onBack={handleBack}>
      <div className="space-y-6">
         {/* Introduction */}
         <div>
           <h1 className="text-sm font-semibold text-gray-800">Review Details & Select Obligation</h1>
         </div>

         {/* Combined Card */}
         <Card className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-2">Taxpayer Details Preview</h2>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Full Name:</span>
                  <span className="text-gray-900 font-semibold">{taxpayerInfo.fullName}</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">ID Number:</span>
                  <span className="text-gray-900 font-semibold">{taxpayerInfo.idNumber}</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">PIN:</span>
                  <span className="text-gray-900 font-semibold">{taxpayerInfo.pin}</span>
                </div>
              </div>

               <button 
                onClick={() => router.push('/nil-mri-tot/nil/validation')}
                className="text-[var(--kra-red)] text-xs font-medium mt-3 hover:underline text-left block"
              >
                Not your profile? Go back to Edit your details
              </button>
            </div>
         </Card>

         {/* Selection Section */}
         <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Select obligation to file as NIL</h2>
            
            {loadingObligations ? (
              <div className="flex items-center text-gray-500 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Fetching obligations...</span>
              </div>
            ) : obligations.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">No Valid Tax Options</p>
                  <p className="text-xs text-amber-700 mt-1">
                    You have no valid tax obligations eligible for NIL filing. (Income Tax, MRI, VAT, or PAYE).
                  </p>
                </div>
              </div>
            ) : (
              <Select
                label=""
                value={selectedObligation}
                onChange={setSelectedObligation}
                options={obligations}
              />
            )}

            {/* Filing Period Display */}
            {selectedObligation && (
              <div className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                {loadingPeriod ? (
                  <div className="flex items-center text-gray-500 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Fetching filing period...</span>
                  </div>
                ) : filingPeriod ? (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Filing Period:</span>
                    <span className="font-medium text-gray-900">{filingPeriod}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-amber-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">No Filing Period Available</p>
                      <p className="text-xs mt-1">There is no available filing period for this obligation.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <Button 
              onClick={handleFileReturn}
              disabled={!selectedObligation || !filingPeriod || loading}
              className="mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Filing...</>
              ) : (
                'File NIL Return'
              )}
            </Button>
         </div>
      </div>
    </Layout>
  );
}

export default function NilVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <NilVerifyContent />
    </Suspense>
  );
}
