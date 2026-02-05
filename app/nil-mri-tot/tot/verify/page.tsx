'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Layout, IdentityStrip, Button, Input, Card, TotalsCard } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { fileTotReturn, getTaxpayerObligations, getFilingPeriods, generatePrn, makePayment, getStoredPhone, sendWhatsAppMessage, calculateTax } from '@/app/actions/nil-mri-tot';
import { Loader2, AlertCircle } from 'lucide-react';
import { analytics } from '@/app/_lib/analytics';
import { getKnownPhone } from '@/app/_lib/session-store';

function TotVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Form State
  const [filingMode, setFilingMode] = useState<'Daily' | 'Monthly'>();
  const [grandTotal, setGrandTotal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [prn, setPrn] = useState('');

  // Filing Period State
  const [filingPeriod, setFilingPeriod] = useState<string>('');
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState<string>('');
  
  // New state for dynamic calculation
  const [calculatedTax, setCalculatedTax] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  const [hasTotObligation, setHasTotObligation] = useState<boolean | null>(null);
  const [checkingObligation, setCheckingObligation] = useState(true);
  const [totObligationCode, setTotObligationCode] = useState<string>('8');

  // Get today's date in DD/MM/YYYY format for daily filing
  const getTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    // Debounce calculation
    const timer = setTimeout(async () => {
      if (grandTotal && Number(grandTotal) > 0 && filingPeriod && taxpayerInfo?.pin) {
         setIsCalculating(true);
         try {
          console.log('Calculating Tax');
             // Extract start date from period if hyphenated
             const result = await calculateTax(
                 taxpayerInfo.pin,
                 '8', // TOT Obligation ID
                 totObligationCode,
                 filingMode === 'Daily' ? getTodayDate() : filingPeriod,
                 Number(grandTotal),
                 filingMode === 'Daily' ? 'D' : 'M'
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
  }, [grandTotal, filingPeriod, taxpayerInfo, filingMode]);

  // Initialize and Check Obligations
  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    if (!info.idNumber) {
      router.push('/nil-mri-tot/tot/validation');
    }
  }, [router]);

  // Check for TOT Obligation & Fetch Periods (only for Monthly)
  useEffect(() => {
    if (!mounted) return;

    if (!taxpayerInfo?.pin) {
      setCheckingObligation(false);
      return;
    }

    const checkObligationAndFetchPeriods = async () => {
      setCheckingObligation(true);
      try {
        const result = await getTaxpayerObligations(taxpayerInfo.pin);
        if (result.success && result.obligations) {
          const hasTot = result.obligations.some(obs => 
            obs.obligationName.toLowerCase().includes('turnover tax')
          );
          
          if (hasTot) {
             const totObligation = result.obligations.find(obs => 
                obs.obligationName.toLowerCase().includes('turnover tax')
             );
             if (totObligation && totObligation.obligationCode) {
                 setTotObligationCode(totObligation.obligationCode);
             }
          }

          setHasTotObligation(hasTot);

          if (hasTot && filingMode === 'Monthly') {
             setLoadingPeriod(true);
             setFilingPeriod(''); // Clear previous period (e.g. from Daily)
             setPeriodError('');  // Clear previous error
             try {
                const periodCheck = await getFilingPeriods(taxpayerInfo.pin, '8'); // 8 is TOT
                if (periodCheck.success && periodCheck.periods && periodCheck.periods.length > 0) {
                   setFilingPeriod(periodCheck.periods[periodCheck.periods.length - 1]);
                   setPeriodError('');
                } else if (periodCheck.message) {
                   const msg = periodCheck.message as any;
                   setFilingPeriod(''); // Ensure period remains empty on error
                   setPeriodError(typeof msg === 'string' ? msg : msg?.message || 'No filing period available');
                } else {
                   setFilingPeriod('');
                   setPeriodError('No filing period available'); 
                }
             } catch (e) {
                console.error("Error fetching periods", e);
                setPeriodError('Failed to fetch periods');
             } finally {
                setLoadingPeriod(false);
             }
          }
        } else {
          setHasTotObligation(false); 
        }
      } catch (err) {
        console.error("Failed to check obligations", err);
        setHasTotObligation(false);
      } finally {
        setCheckingObligation(false);
      }
    };

    checkObligationAndFetchPeriods();
  }, [taxpayerInfo?.pin, mounted, filingMode]);

  // Set filing period based on mode
  useEffect(() => {
    if (filingMode === 'Daily') {
      const today = getTodayDate();
      setFilingPeriod(`${today} - ${today}`);
      setPeriodError(''); // Clear any periodic error from Monthly
    } else {
        // When switching to Monthly, we might want to clear the daily period immediately
        // while the other effect fetches the new period.
        setFilingPeriod(''); 
    }
  }, [filingMode]);

  const handleFileReturn = async (action: 'file_and_pay' | 'file_only' | 'pay_only') => {
    if (!grandTotal) {
       setError('Please enter the turnover amount');
       return;
    }
    
    if (Number(grandTotal) <= 0) {
       setError('Amount must be greater than zero');
       return;
    }
    
    if (!filingPeriod) {
       setError('Filing period not available');
       return;
    }
    
    setLoading(true);
    setError('');
    taxpayerStore.setError(''); // Clear any previous store errors
    setPaymentStatus('');
    setPrn('');
    
    try {
      if (!filingMode) {
        setError('Select filing mode');
        return;
      }
      // 1. File Return
      const result = await fileTotReturn(
        taxpayerInfo.pin,
        filingPeriod,
        Number(grandTotal),
        filingMode,
       
      );
     
 


      if (!result.success) {
        taxpayerStore.setFilingPeriod(filingPeriod);
        taxpayerStore.setError(result.message || 'Failed to file TOT return');
        analytics.track('form_submitted', { form_id: 'tot_filing', status: 'failure', error: result.message });
        router.push('/nil-mri-tot/tot/result');
        setLoading(false);
        return;
      }
      
      analytics.track('form_submitted', { form_id: 'tot_filing', status: 'success', amount: grandTotal });

      // If just filing (monthly only), redirect
      if (action === 'file_only') {
          try {
             taxpayerStore.setReceiptNumber(result.receiptNumber || '');
             taxpayerStore.setFilingPeriod(filingPeriod);
          } catch (e) {}

          analytics.track('return_filed', { 
            return_type: 'tot', 
            receipt_number: result.receiptNumber 
          });

          router.push('/nil-mri-tot/tot/result');
          setLoading(false);
          return;
      }

      // 2. Generate PRN (File & Pay or Pay Only)
      if (action === 'file_and_pay' || action === 'pay_only') {
          setPaymentStatus('Generating PRN...');
          
          let prnValue = '';
          // Check if PRN was returned from filing (only for file_and_pay and if it was a file action)
          if (action === 'file_and_pay' || action === 'pay_only'){
              const [from, to] = filingPeriod.split(' - ');
              const taxPayable = (Number(grandTotal) * 0.03).toFixed(2);
    
              const prnRes = await generatePrn(
                 taxpayerInfo.pin,
                 '8', // TOT Obligation
                 from,
                 to,
                 taxPayable
              );
    
             
    
              if (!prnRes.success || !prnRes.prn) {
                 taxpayerStore.setFilingPeriod(filingPeriod);
                 taxpayerStore.setError(`Return filed, but PRN generation failed: ${prnRes.message}`);
                 router.push('/nil-mri-tot/tot/result');
                 setLoading(false);
                 return;
              }
              prnValue = prnRes.prn;
          }

          setPrn(prnValue);
          setPaymentStatus('Initiating Payment...');

          // 3. Make Payment
          const storedPhone = await getStoredPhone();
          
          // Always set store data before potential redirect
          taxpayerStore.setPrn(prnValue);
          taxpayerStore.setFilingPeriod(filingPeriod);
          if (calculatedTax > 0) taxpayerStore.setTaxAmount(calculatedTax);
          
          if (storedPhone) {
             const payRes = await makePayment(storedPhone, prnValue);
             if (payRes.success) {
                setPaymentStatus('Payment initiated. Check your phone.');
                analytics.track('payment_initiated', { 
                  amount: calculatedTax, 
                  currency: 'KES', 
                  prn: prnValue 
                });
                setTimeout(() => {
                   router.push('/nil-mri-tot/tot/result');
                }, 2000);
             } else {
                // Payment failed, but PRN is valid. Redirect to result to show PRN.
                console.warn('Payment initiation failed, redirecting to result with PRN');
                
                // Send WhatsApp message with PRN
                await sendWhatsAppMessage({
                  recipientPhone: storedPhone,
                  message: `*TOT Return Filed*\n\nYour Turnover Tax return has been filed.\n\nPRN: *${prnValue}*\nAmount: KES ${calculatedTax}\n\nPlease pay via M-Pesa Paybill 222222, Account: ${prnValue}`
                });

                router.push('/nil-mri-tot/tot/result');
             }
          } else {
             // No phone found, redirect to result with PRN
             router.push('/nil-mri-tot/tot/result');
          }
      }

    } catch (err: any) {
       console.error(err);
       taxpayerStore.setFilingPeriod(filingPeriod);
       taxpayerStore.setError(err.message || 'An unexpected error occurred');
       router.push('/nil-mri-tot/tot/result');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
     const targetUrl = `/nil-mri-tot/tot/validation${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`;
     router.push(targetUrl);
  };

  if (!mounted || !taxpayerInfo?.idNumber) {
    return null;
  }

  if (checkingObligation) {
    return (
      <Layout title="Verify & File TOT" onBack={handleBack} showMenu>
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--kra-red)]" />
          
        </div>
      </Layout>
    );
  }

  if (hasTotObligation === false) {
    const handleClose = async () => {
      // Send WhatsApp message
      const storedPhone = await getStoredPhone();
      if (storedPhone && taxpayerInfo) {
        const message = `*Turnover Tax Status*
 
Dear *${taxpayerInfo.fullName}*,
Your PIN: *${taxpayerInfo.pin}* currently has *no Turnover Tax (TOT) obligation*.

No filing or payment is required at this time.

If your business income qualifies for TOT in the future, please contact *KRA* to update your tax profile.`;
        
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
      <Layout title="Turnover Tax" onBack={handleBack} showMenu>
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

               {!filingMode && (
               
               <button 
                 onClick={handleBack}
                 className="text-[var(--kra-red)] text-xs font-medium mt-2 hover:underline text-left block"
               >
                 Not your profile? Go back to Edit your details
               </button>
               )}
             </div>
          </Card>

          {/* Info Card */}
          <Card className="p-6 bg-blue-50 border border-blue-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">No Turnover Tax Obligation</h2>
            
            <div className="flex items-start gap-3 bg-white/60 p-4 rounded-lg border border-blue-100">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div className="text-sm text-gray-700">
                <p>You do not currently have a Turnover Tax (TOT) obligation.</p>
               
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

  return (
    <Layout title="Verify & File TOT" onBack={handleBack} showMenu>
      <div className="space-y-6">
         {/* Combined Identity & Details Card */}
         <Card className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-2">Taxpayer Details Preview</h2>
              <div className="space-y-1">
                <IdentityStrip label="Name" value={taxpayerInfo.fullName} />
                <IdentityStrip label="ID Number" value={taxpayerInfo.idNumber} />
                <IdentityStrip label="PIN" value={taxpayerInfo.pin} />
              </div>

              {!filingMode && (
               <button 
                onClick={handleBack}
                className="text-[var(--kra-red)] text-xs font-medium mt-2 hover:underline text-left block"
              >
                Not your profile? Go back to Edit your details
              </button>
              )}
            </div>
         </Card>

         {/* Filing Mode Selection */}
         <Card className="p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Filing Type</h2>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filingMode"
                  value="Daily"
                  checked={filingMode === 'Daily'}
                  onChange={() => setFilingMode('Daily')}
                  className="w-4 h-4 text-[var(--kra-red)] border-gray-300 focus:ring-[var(--kra-red)]"
                />
                <span className="text-sm text-gray-700">Daily</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filingMode"
                  value="Monthly"
                  checked={filingMode === 'Monthly'}
                  onChange={() => setFilingMode('Monthly')}
                  className="w-4 h-4 text-[var(--kra-red)] border-gray-300 focus:ring-[var(--kra-red)]"
                />
                <span className="text-sm text-gray-700">Monthly</span>
              </label>
            </div>
         </Card>

         {/* Filing Form */}
         <Card className="p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Return Details</h2>
            
             <div className="space-y-4">
                {/* Filing Period/Date Display */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                   <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {filingMode === 'Daily' ? 'Filing Date' : 'Filing Period'}
                      </span>
                      {loadingPeriod ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : filingPeriod ? (
                        <span className="text-sm font-semibold text-gray-900">
                          {filingMode === 'Daily' ? getTodayDate() : filingPeriod}
                        </span>
                      ) : periodError ? (
                        <span className="text-sm text-red-500">{periodError}</span>
                      ) : (
                        <span className="text-sm text-red-500">No period available</span>
                      )}
                   </div>
                </div>

                {filingPeriod && (
                  <Input
                  label={filingMode === 'Daily' ? 'Gross Daily Sales (KES)' : 'Gross Monthly Sales (KES)'}
                  value={grandTotal}
                  onChange={setGrandTotal}
                  type="number"
                  placeholder="Enter amount"
                  required
                  disabled={!filingPeriod}
                />
                )}
                {Number(grandTotal) > 0 && (
                  <TotalsCard
                    subtotal={Number(grandTotal)}
                    tax={calculatedTax}
                    total={calculatedTax}
                    taxLabel="TOT Tax"
                  />
                )}
                {isCalculating && <p className="text-xs text-blue-600 mt-1">Calculating tax...</p>}
             </div>
          </Card>

          {error && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
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

          {/* Action Buttons - Conditional based on filing mode */}
          <div className="space-y-3 pt-2">
             {/* Finish button for Monthly mode with no filing period or period error */}
             {filingMode === 'Monthly' && !loadingPeriod && (!filingPeriod || periodError) && (
               <Button 
                  onClick={async () => {
                    const storedPhone = await getStoredPhone();
                    if (storedPhone && taxpayerInfo) {
                      const message = `*Turnover Tax Status*\n\nDear *${taxpayerInfo.fullName}*,\nYour PIN: *${taxpayerInfo.pin}* currently has no available filing period for Turnover Tax (TOT).\n\n${periodError || 'No filing is required at this time.'}\n\nPlease try again later or contact KRA for assistance.`;
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

             {filingMode === 'Daily' ? (
                // Daily: Pay Now only
                <Button 
                   onClick={() => handleFileReturn('pay_only')}
                   disabled={loading || !grandTotal}
                   className="w-full bg-[var(--kra-red)] hover:bg-red-700"
                >
                   {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                   Pay Now
                </Button>
             ) : filingPeriod && !periodError ? (
                // Monthly with valid period: File & Pay + File Only
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => handleFileReturn('file_and_pay')}
                    disabled={loading || !grandTotal || !filingPeriod}
                    className="w-full bg-[var(--kra-red)] hover:bg-red-700"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    File & Pay
                  </Button>
                  <Button 
                    onClick={() => handleFileReturn('file_only')}
                    disabled={loading || !grandTotal || !filingPeriod}
                    variant="secondary"
                    className="w-full border-[var(--kra-red)] text-[var(--kra-red)] hover:bg-red-50"
                  >
                     File Only
                  </Button>
               </div>
             ) : null}
          </div>
      </div>
    </Layout>
  );
}

export default function TotVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <TotVerifyContent />
    </Suspense>
  );
}
