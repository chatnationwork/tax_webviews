'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Layout, Button, Select, Card, IdentityStrip } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { Loader2, AlertCircle } from 'lucide-react';
import { fileNilReturn, getFilingPeriods, getTaxpayerObligations, getStoredPhone, sendWhatsAppMessage } from '@/app/actions/nil-mri-tot';
import { analytics } from '@/app/_lib/analytics';
import { getKnownPhone } from '@/app/_lib/session-store';

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
  const [periodError, setPeriodError] = useState<string>('');
  
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
              obligationId: obs.obligationId,
              obligationCode: obs.obligationCode
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
          setPeriodError('');
        } else {
          setFilingPeriod('');
          if (result.message) {
            const msg = result.message as any;
            setPeriodError(typeof msg === 'string' ? msg : msg?.message || 'No filing period available');
          } else {
            setPeriodError('No filing period available');
          }
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
    taxpayerStore.setError(''); // Clear any previous store errors
    
    try {
      // selectedObligation is serving as the obligation ID in the new dynamic list
      const obligationId = selectedObligation;
      const selectedObsObj = obligations.find(o => o.value === selectedObligation);
      const obligationCode = selectedObsObj?.obligationCode || obligationId;

      const result = await fileNilReturn(
        taxpayerInfo.pin,
        obligationId,
        obligationCode,
        filingPeriod
      );

      // Find the name of the selected obligation
      // selectedObsObj is already defined above
      const obligationName = selectedObsObj ? selectedObsObj.label : 'NIL Return';

      if (result.success) {
        taxpayerStore.setSelectedNilType(obligationName);
        taxpayerStore.setReceiptNumber(result.receiptNumber || '');
        taxpayerStore.setSuccessMessage(result.message);
        if (result.taxDue) {
            taxpayerStore.setTaxAmount(Number(result.taxDue) || 0);
        }
        // Clear any previous error
        taxpayerStore.setError('');
        
        analytics.track('return_filed', { 
            return_type: 'nil', 
            obligation: obligationName,
            receipt_number: result.receiptNumber 
        });
        
        router.push('/nil-mri-tot/nil/result');
      } else {
        // Handle API error by redirecting to result page
        taxpayerStore.setSelectedNilType(obligationName);
        taxpayerStore.setError(result.message || 'Failed to file NIL return');
        router.push('/nil-mri-tot/nil/result');
      }
    } catch (err: any) {
       // Handle Exception by redirecting to result page
       console.error(err);
       // Re-calculate name if needed or fallback
       const selectedObsObj = obligations.find(o => o.value === selectedObligation);
       const obligationName = selectedObsObj ? selectedObsObj.label : 'NIL Return';
       
       taxpayerStore.setSelectedNilType(obligationName);
       taxpayerStore.setError(err.message || 'An unexpected error occurred');
       router.push('/nil-mri-tot/nil/result');
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
          const localPhone = getKnownPhone();
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

  const handleFinish = async (reason: 'no_obligation' | 'no_period') => {
    // Send WhatsApp message
    const storedPhone = await getStoredPhone();
    if (storedPhone && taxpayerInfo) {
      let message: string;
      
      if (reason === 'no_obligation') {
        message = `Dear ${taxpayerInfo.fullName},

Your PIN: ${taxpayerInfo.pin} does not currently have any tax obligations eligible for NIL filing.

This includes Income Tax, VAT, and PAYE.

No action is required at this time.`;
      } else {
        message = `Dear ${taxpayerInfo.fullName},

Your PIN: ${taxpayerInfo.pin} currently has no available filing period for the selected obligation.

No action is required at this time.`;
      }
      
      await sendWhatsAppMessage({
        recipientPhone: storedPhone,
        message: message
      });
    }
    
    // Redirect to home
    router.push('/');
  };

  return (
    <Layout title="Back to Taxpayer Validation" onBack={handleBack} showMenu>
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
                <IdentityStrip label="Name" value={taxpayerInfo.fullName} />
                <IdentityStrip label="ID Number" value={taxpayerInfo.idNumber} />
                <IdentityStrip label="PIN" value={taxpayerInfo.pin} />
              </div>

               {!selectedObligation && (
                 <button 
                  onClick={() => router.push('/nil-mri-tot/nil/validation')}
                  className="text-[var(--kra-red)] text-xs font-medium mt-3 hover:underline text-left block"
                >
                  Not your profile? Go back to Edit your details
                </button>
               )}
            </div>
         </Card>

         {/* Selection Section */}
         <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Select obligation to file as NIL</h2>
            
            {loadingObligations ? (
              <div className="flex items-center text-gray-500 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Loader2 className="w-4 h-4 animate-spin" />
               
              </div>
            ) : obligations.length === 0 ? (
              <>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">i</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">No Eligible NIL Filing</p>
                    <p className="text-xs text-gray-700 mt-1">
                      Based on our records, you do not currently have any tax obligations eligible for NIL filing.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleFinish('no_obligation')}
                  className="w-full bg-[var(--kra-red)] hover:bg-red-700 mt-4"
                >
                  Finish
                </Button>
              </>
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
                      <p className="text-xs mt-1">{periodError || 'There is no available filing period for this obligation.'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Finish button when no filing period */}
            {selectedObligation && !loadingPeriod && !filingPeriod && (
              <Button 
                onClick={() => handleFinish('no_period')}
                className="w-full bg-[var(--kra-red)] hover:bg-red-700"
              >
                Finish
              </Button>
            )}

            {error && (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER }?xtext=${encodeURIComponent('Main menu')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Back to WhatsApp
                </a>
              </div>
            )}

            {obligations.length > 0 && filingPeriod && !periodError && (
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
            )}
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
