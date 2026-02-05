'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';
import { 
  fileMriReturn, 
  getProperties, 
  getFilingPeriods, 
  getTaxpayerObligations,
  Property, 
  generatePrn, 
  makePayment, 
  getStoredPhone,
  sendWhatsAppMessage,
  calculateTax
} from '@/app/actions/nil-mri-tot';
import { Layout, Card, IdentityStrip, Input, Button, TotalsCard } from '@/app/_components/Layout';
import { analytics } from '@/app/_lib/analytics';
import { getKnownPhone } from '@/app/_lib/session-store';


function MriRentalIncomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [rentalIncome, setRentalIncome] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [prn, setPrn] = useState('');
  
  // Properties state
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  
  // Obligation Code
  const [mriObligationCode, setMriObligationCode] = useState<string>('33');

  // Filing Period state
  const [filingPeriod, setFilingPeriod] = useState<string>('');
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState<string>('');

  // New state for dynamic calculation
  const [calculatedTax, setCalculatedTax] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // Obligation Check state
  const [hasMriObligation, setHasMriObligation] = useState<boolean | null>(null);
  const [checkingObligation, setCheckingObligation] = useState(true);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    if (!info.idNumber || !info.pin) {
      router.push('/nil-mri-tot/mri/validation');
    }
  }, [router]);

  useEffect(() => {
    // Debounce calculation
    const timer = setTimeout(async () => {
      if (rentalIncome && Number(rentalIncome) > 0 && filingPeriod && taxpayerInfo?.pin) {
         setIsCalculating(true);
         try {
             // Extract start date from period if hyphenated
             const result = await calculateTax(
                 taxpayerInfo.pin,
                 '33', // MRI Obligation ID
                 mriObligationCode, 
                 filingPeriod,
                 Number(rentalIncome),
                 'M'
             );
             
             if (result.success && result.tax !== undefined) {
                 setCalculatedTax(result.tax);
             } else {
                 setCalculatedTax(0); 
             }
         } catch (e) {
             console.error('Tax calc error', e);
         } finally {
             setIsCalculating(false);
         }
      } else {
          setCalculatedTax(0);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [rentalIncome, filingPeriod, taxpayerInfo]);

  // Check Obligation & Fetch Data
  useEffect(() => {
    if (!mounted || !taxpayerInfo?.pin) {
      setCheckingObligation(false);
      return;
    }

    const checkObligationAndFetchData = async () => {
      setCheckingObligation(true);
      try {
        // Check for MRI Obligation
        const result = await getTaxpayerObligations(taxpayerInfo.pin);
        if (result.success && result.obligations) {
          const hasMri = result.obligations.some(obs => 
            obs.obligationName.toLowerCase().includes('mri') ||
            obs.obligationName.toLowerCase().includes('rental')
          );
          
          if (hasMri) {
             const mriObligation = result.obligations.find(obs => 
                obs.obligationName.toLowerCase().includes('mri') ||
                obs.obligationName.toLowerCase().includes('rental')
             );
             if (mriObligation && mriObligation.obligationCode) {
                 setMriObligationCode(mriObligation.obligationCode);
             }
          }

          setHasMriObligation(hasMri);

          if (hasMri) {
            // Fetch Filing Period
            setLoadingPeriod(true);
            try {
              const res = await getFilingPeriods(taxpayerInfo.pin, '33'); // 33 is MRI
              if (res.success && res.periods && res.periods.length > 0) {
                // Use the latest filing period
                setFilingPeriod(res.periods[res.periods.length - 1]);
                setPeriodError('');
              } else if (res.message) {
                // API returned an error message (e.g. "Return for period X can be filed after Y")
                const msg = res.message as any;
                setPeriodError(typeof msg === 'string' ? msg : msg?.message || 'No filing period available');
              }
            } catch (err) {
              console.error("Failed to fetch filing period", err);
            } finally {
              setLoadingPeriod(false);
            }

            // Fetch Properties
            setLoadingProperties(true);
            try {
              const res = await getProperties(taxpayerInfo.pin);
              if (res.success && res.properties) {
                setProperties(res.properties);
              }
            } catch (err) {
              console.error("Failed to fetch properties", err);
            } finally {
              setLoadingProperties(false);
            }
          }
        } else {
          setHasMriObligation(false);
        }
      } catch (err) {
        console.error("Failed to check obligations", err);
        setHasMriObligation(false);
      } finally {
        setCheckingObligation(false);
      }
    };

    checkObligationAndFetchData();
  }, [taxpayerInfo?.pin, mounted]);

  const handleBack = () => {
    const targetUrl = `/nil-mri-tot/mri/validation${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`;
    router.push(targetUrl);
  };

  if (!mounted || !taxpayerInfo?.idNumber) {
    return null;
  }

  // Loading state
  if (checkingObligation) {
    return (
      <Layout title="MRI Returns" onBack={handleBack} showMenu>
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--kra-red)]" />
          
        </div>
      </Layout>
    );
  }

  // No Obligation UI
  if (hasMriObligation === false) {
    const handleClose = async () => {
      // Send WhatsApp message
      const storedPhone = await getStoredPhone();
      if (storedPhone && taxpayerInfo) {
        const message = `*Monthly Rental Income Status*
 
Dear *${taxpayerInfo.fullName}*,
Your PIN: *${taxpayerInfo.pin}* currently has *no Monthly Rental Income (MRI) obligation*.

No filing or payment is required at this time.

If you have rental income in the future, please contact *KRA* to update your tax profile.`;
        
        await sendWhatsAppMessage({
          recipientPhone: storedPhone,
          message: message
        });
      }
      
      // Redirect to home
      const msisdn = taxpayerStore.getMsisdn() || getKnownPhone();
      taxpayerStore.clear();
      router.push(`/?msisdn=${msisdn || ''}`);
    };

    return (
      <Layout title="Monthly Rental Income" onBack={handleBack} showMenu>
        <div className="space-y-6">
          {/* Taxpayer Details */}
          <Card className="p-4 space-y-4">
             <div>
               <h2 className="text-sm font-semibold text-gray-800 mb-2">Taxpayer Details</h2>
               <div className="space-y-1">
                 <IdentityStrip label="Name" value={taxpayerInfo?.fullName || 'Unknown'} />
                 <IdentityStrip label="ID Number" value={taxpayerInfo?.idNumber || 'Unknown'} />
                 <IdentityStrip label="PIN" value={taxpayerInfo?.pin || 'Unknown'} />
               </div>
               <button 
                 onClick={handleBack}
                 className="text-[var(--kra-red)] text-xs font-medium mt-2 hover:underline text-left block"
               >
                 Not your profile? Go back to Edit your details
               </button>
             </div>
          </Card>

          {/* Info Card */}
          <Card className="p-6 bg-blue-50 border border-blue-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">No MRI Obligation</h2>
            
            <div className="flex items-start gap-3 bg-white/60 p-4 rounded-lg border border-blue-100">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div className="text-sm text-gray-700">
                <p>You do not currently have a Monthly Rental Income (MRI) obligation.</p>

              </div>
            </div>
          </Card>

          {/* Finish Button */}
          <Button 
            onClick={handleClose}
            className="w-full bg-[var(--kra-red)] hover:bg-red-700"
          >
            Finish
          </Button>
        </div>
      </Layout>
    );
  }

  const taxRate = 0.1; // 10%
  const mriTax = rentalIncome ? Number(rentalIncome) * taxRate : 0;

  const handleFileReturn = async (withPayment: boolean) => {
    if (!rentalIncome || !filingPeriod) {
        setError("Please enter rental income.");
        return;
    }

    setLoading(true);
    setError('');
    taxpayerStore.setError(''); // Clear any previous store errors
    setPaymentStatus('');
    setPrn('');
    
    try {
      const no_of_properties = properties.length;
      // 1. File Return
      const result = await fileMriReturn(
        taxpayerInfo.pin,
        filingPeriod,
        Number(rentalIncome),
        Number(no_of_properties)
      );

      if (!result.success) {
        // Handle error: redirect to result page
        taxpayerStore.setRentalIncome(Number(rentalIncome));
        taxpayerStore.setFilingPeriod(filingPeriod);
        taxpayerStore.setError(result.message || 'Failed to file MRI return');
        analytics.track('form_submitted', { form_id: 'mri_filing', status: 'failure', error: result.message });
        router.push('/nil-mri-tot/mri/result');
        setLoading(false);
        return;
      }

      analytics.track('form_submitted', { form_id: 'mri_filing', status: 'success', amount: rentalIncome });

      // If file-only, redirect
      if (!withPayment) {
          taxpayerStore.setRentalIncome(Number(rentalIncome));
          taxpayerStore.setFilingPeriod(filingPeriod);
          taxpayerStore.setPaymentType('file-only');
          taxpayerStore.setError(''); // Clear error
          try {
             (taxpayerStore as any).setReceiptNumber(result.receiptNumber || '');
          } catch (e) {}

          analytics.track('return_filed', { 
            return_type: 'mri', 
            receipt_number: result.receiptNumber 
          });

          router.push('/nil-mri-tot/mri/result');
          setLoading(false);
          return;
      }

      // 2. Generate PRN (File & Pay)
      if (withPayment) {
          setPaymentStatus('Generating PRN...');
          
          const [from, to] = filingPeriod.split(' - ');
          // MRI Rate: 10%
          const taxPayable = (Number(rentalIncome) * 0.1).toFixed(2);

          const prnRes = await generatePrn(
             taxpayerInfo.pin,
             '33', // MRI Obligation
             from,
             to,
             taxPayable
          );

          if (!prnRes.success || !prnRes.prn) {
             // Handle PRN Error
             taxpayerStore.setRentalIncome(Number(rentalIncome));
             taxpayerStore.setFilingPeriod(filingPeriod);
             taxpayerStore.setError(`Return filed, but PRN generation failed: ${prnRes.message}`);
             router.push('/nil-mri-tot/mri/result');
             setLoading(false);
             return;
          }

          setPrn(prnRes.prn);
          setPaymentStatus('Initiating Payment...');

          // 3. Make Payment
          const phone = await getStoredPhone();
          
          // Set Store Data
          taxpayerStore.setRentalIncome(Number(rentalIncome));
          taxpayerStore.setFilingPeriod(filingPeriod);
          taxpayerStore.setPaymentType('file-and-pay');
          taxpayerStore.setPrn(prnRes.prn);
          taxpayerStore.setTaxAmount(Number(taxPayable));
          taxpayerStore.setError('');
           try {
             (taxpayerStore as any).setReceiptNumber(result.receiptNumber || '');
          } catch (e) {}

          if (phone) {
             const payRes = await makePayment(phone, prnRes.prn);
             if (payRes.success) {
                setPaymentStatus('Payment initiated. Check your phone.');
                analytics.track('payment_initiated', { 
                  amount: taxPayable, 
                  currency: 'KES', 
                  prn: prnRes.prn 
                });
                setTimeout(() => {
                   router.push('/nil-mri-tot/mri/result');
                }, 2000);
             } else {
                 // Payment failed but PRN exists - redirect to result (not error state, show PRN)
                 router.push('/nil-mri-tot/mri/result');
             }
          } else {
             // Phone missing - redirect to result (show PRN)
             router.push('/nil-mri-tot/mri/result');
          }
      }

    } catch (err: any) {
       console.error(err);
       taxpayerStore.setRentalIncome(Number(rentalIncome));
       taxpayerStore.setError(err.message || 'An unexpected error occurred');
       router.push('/nil-mri-tot/mri/result');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="MRI Returns" step="Step 2: Rental Income" onBack={handleBack} showMenu>
      <div className="space-y-6">
        {/* Taxpayer Details */}
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
               Not your profile? Go back to Edit your details
             </button>
           </div>
        </Card>

        {/* Filing Period & Properties */}
        <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Declare Rental Income</h2>

            {/* Filing Period Display (not a select anymore) */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
               <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Filing Period</span>
                  {loadingPeriod ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : filingPeriod ? (
                    <span className="text-sm font-semibold text-gray-900">{filingPeriod}</span>
                  ) : periodError ? (
                    <span className="text-sm text-red-500">{periodError}</span>
                  ) : (
                    <span className="text-sm text-red-500">No period available</span>
                  )}
               </div>
            </div>

            {/* Properties List */}
            <div>
               <h3 className="text-sm font-medium text-gray-700 mb-2">Properties </h3>
               <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 border-b border-gray-200 text-xs font-bold text-gray-700">
                     <div>Property Name</div>
                     <div>Location</div>
                     <div>Property ID</div>
                  </div>
                  {loadingProperties ? (
                     <div className="p-4 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                     </div>
                  ) : properties.length === 0 ? (
                     <div className="p-4 text-center text-xs text-gray-500">
                        No properties found.
                     </div>
                  ) : (
                     <div className="divide-y divide-gray-100">
                        {properties.map((prop, idx) => (
                           <div key={idx} className="grid grid-cols-3 gap-2 p-2 text-xs text-gray-600">
                              <div className="truncate">{prop.Building || 'N/A'}</div>
                              <div className="truncate">{prop.LocalityStr || 'N/A'}</div>
                              <div className="truncate font-mono">{prop.PropertyRegId}</div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            {/* Income Input - Only show if properties exist */}
            {properties.length > 0 && filingPeriod && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                 <Input
                    label="Total Rental Income (KES)"
                    value={rentalIncome}
                    onChange={setRentalIncome}
                    type="number"
                    placeholder="e.g 50000"
                    required
                    disabled={!filingPeriod}
                 />

                 {Number(rentalIncome) > 0 && (
                  <TotalsCard
                      subtotal={Number(rentalIncome)}
                      tax={calculatedTax}
                      total={calculatedTax}
                      taxLabel="MRI Tax"
                   />
                 )}
                 {isCalculating && <p className="text-xs text-blue-600 mt-1">Calculating tax...</p>}
              </div>
            )}

            {/* No Properties Warning */}
            {!loadingProperties && properties.length === 0 && (
              <>
                <Card className="p-4 bg-yellow-50 border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold">No Properties Registered</p>
                      <p className="mt-1">You need to have registered properties under your PIN to file MRI returns.</p>
                    </div>
                  </div>
                </Card>
                <Button 
                  onClick={async () => {
                    const storedPhone = await getStoredPhone();
                    if (storedPhone && taxpayerInfo) {
                      const message = `*Monthly Rental Income Status*\n\nDear *${taxpayerInfo.fullName}*,\nYour PIN: *${taxpayerInfo.pin}* has no registered properties for MRI filing.\n\nTo file MRI returns, please register your rental properties on iTax first.\n\nNo filing is required at this time.`;
                      await sendWhatsAppMessage({
                        recipientPhone: storedPhone,
                        message: message
                      });
                    }
                    router.push('/');
                  }}
                  className="w-full bg-[var(--kra-red)] hover:bg-red-700"
                >
                  Finish
                </Button>
              </>
            )}

            {error && (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER }?text=${encodeURIComponent('Main menu')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Back to WhatsApp
                </a>
              </div>
            )}

            {prn && (
               <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">
                  <p className="font-bold">PRN Generated: {prn}</p>
                  {paymentStatus && <p>{paymentStatus}</p>}
               </div>
            )}

            {/* Action Buttons - Only show if properties exist */}
            {properties.length > 0 && (
              <>
                {/* Finish button when no filing period or period error */}
                {!loadingPeriod && (!filingPeriod || periodError) && (
                  <Button 
                    onClick={async () => {
                      const storedPhone = await getStoredPhone();
                      if (storedPhone && taxpayerInfo) {
                        const message = `*Monthly Rental Income Status*\n\nDear *${taxpayerInfo.fullName}*,\nYour PIN: *${taxpayerInfo.pin}* currently has no available filing period for Monthly Rental Income (MRI).\n\n${periodError || 'No filing is required at this time.'}\n\nPlease try again later or contact KRA for assistance.`;
                        await sendWhatsAppMessage({
                          recipientPhone: storedPhone,
                          message: message
                        });
                      }
                      router.push('/');
                    }}
                    className="w-full bg-[var(--kra-red)] hover:bg-red-700"
                  >
                    Finish
                  </Button>
                )}

                {/* File & Pay buttons - Only show when valid filing period */}
                {filingPeriod && !periodError && (
                  <div className="grid grid-cols-2 gap-3">
                     <Button
                        onClick={() => handleFileReturn(true)}
                        disabled={loading || !rentalIncome || !filingPeriod}
                        className="bg-[var(--kra-red)] hover:bg-red-700"
                     >
                        {loading && paymentStatus ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        File & Pay
                     </Button>
                     <Button
                        onClick={() => handleFileReturn(false)}
                        disabled={loading || !rentalIncome || !filingPeriod}
                        variant="secondary"
                        className="border border-[var(--kra-red)] text-[var(--kra-red)] hover:bg-red-50"
                     >
                        File Only
                     </Button>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </Layout>
  );
}

export default function MriRentalIncomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <MriRentalIncomeContent />
    </Suspense>
  );
}
