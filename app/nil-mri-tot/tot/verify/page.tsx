'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Layout, IdentityStrip, Button, Select, Input, Card } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { fileTotReturn, getTaxpayerObligations, getFilingPeriods, generatePrn, makePayment, getStoredPhone } from '@/app/actions/nil-mri-tot';
import { Loader2, AlertCircle } from 'lucide-react';

function TotVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Form State
  const [filingMode, setFilingMode] = useState<'Daily' | 'Monthly'>('Monthly');
  const [grandTotal, setGrandTotal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [prn, setPrn] = useState('');

  // Filing Period State
  const [periods, setPeriods] = useState<string[]>([]);
  const [filingPeriod, setFilingPeriod] = useState<string>('');
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  const [hasTotObligation, setHasTotObligation] = useState<boolean | null>(null);
  const [checkingObligation, setCheckingObligation] = useState(true);

  // Initialize and Check Obligations
  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    if (!info.idNumber) {
      router.push('/nil-mri-tot/tot/validation');
    }
  }, [router]);

  // Check for TOT Obligation & Fetch Periods
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
          setHasTotObligation(hasTot);

          if (hasTot) {
             setLoadingPeriod(true);
             try {
                const periodCheck = await getFilingPeriods(taxpayerInfo.pin, '8'); // 8 is TOT
                if (periodCheck.success && periodCheck.periods && periodCheck.periods.length > 0) {
                   setPeriods(periodCheck.periods);
                   setFilingPeriod(periodCheck.periods[periodCheck.periods.length - 1]);
                }
             } catch (e) {
                console.error("Error fetching periods", e);
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
  }, [taxpayerInfo?.pin, mounted]);

  const handleFileReturn = async (action: 'file_and_pay' | 'file_only' | 'pay_only') => {
    if (!grandTotal || !filingPeriod) {
       setError('Please enter turnover amount and select a period');
       return;
    }
    
    setLoading(true);
    setError('');
    setPaymentStatus('');
    setPrn('');
    
    try {
      // 1. File Return
      const result = await fileTotReturn(
        taxpayerInfo.pin,
        filingPeriod,
        Number(grandTotal),
        filingMode,
        action
      );

      if (!result.success) {
        setError(result.message || 'Failed to file TOT return');
        setLoading(false);
        return;
      }

      // If just filing, redirect
      if (action === 'file_only') {
          try {
             taxpayerStore.setReceiptNumber(result.receiptNumber || '');
          } catch (e) {}
          router.push('/nil-mri-tot/tot/result');
          setLoading(false);
          return;
      }

      // 2. Generate PRN (File & Pay)
      if (action === 'file_and_pay') {
          setPaymentStatus('Generating PRN...');
          
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
             setError(`Return filed, but PRN generation failed: ${prnRes.message}`);
             setLoading(false);
             return;
          }

          setPrn(prnRes.prn);
          setPaymentStatus('Initiating Payment...');

          // 3. Make Payment
          const phone = await getStoredPhone();
          if (phone) {
             const payRes = await makePayment(phone, prnRes.prn);
             if (payRes.success) {
                setPaymentStatus('Payment initiated. Check your phone.');
                setTimeout(() => {
                   router.push('/nil-mri-tot/tot/result');
                }, 2000);
             } else {
                setError(`PRN generated (${prnRes.prn}), but payment failed: ${payRes.message}`);
             }
          } else {
             setError(`PRN generated (${prnRes.prn}), but phone number not found for payment.`);
          }
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred filing return');
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
      <Layout title="Verify & File TOT" onBack={handleBack}>
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--kra-red)]" />
          <p className="text-gray-600">Checking obligations...</p>
        </div>
      </Layout>
    );
  }

  if (hasTotObligation === false) {
    return (
      <Layout title="Verify & File TOT" onBack={handleBack}>
        <div className="space-y-6">
           <Card className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-2">Taxpayer Details</h2>
              <div className="space-y-1">
                <IdentityStrip label="Name" value={taxpayerInfo.fullName} />
                <IdentityStrip label="PIN" value={taxpayerInfo.pin} />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-yellow-500 bg-yellow-50">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-1">Obligation Missing</h3>
                <p className="text-sm text-yellow-700">
                  You are not registered for Turnover Tax (TOT). 
                </p>
              </div>
            </div>
           
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Verify & File TOT" onBack={handleBack}>
      <div className="space-y-6">
         {/* Combined Identity & Details Card */}
         <Card className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-2">Taxpayer Details</h2>
              <div className="space-y-1">
                <IdentityStrip label="Name" value={taxpayerInfo.fullName} />
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

         {/* Filing Form */}
         <Card className="p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Return Details</h2>
            
             <div className="space-y-4">
                <Select
                  label="Filing Period"
                  options={periods.map(p => ({ value: p, label: p }))}
                  value={filingPeriod}
                  onChange={(val) => setFilingPeriod(val)}
                  disabled={loadingPeriod || periods.length === 0}
                />
                
                {periods.length === 0 && !loadingPeriod && (
                   <p className="text-xs text-red-500">No filing period found</p>
                )}

                <Input
                  label="Turnover Amount (KES)"
                  value={grandTotal}
                  onChange={setGrandTotal}
                  type="number"
                  placeholder="Enter gross turnover"
                />
             </div>
          </Card>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {prn && (
             <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">
                <p className="font-bold">PRN Generated: {prn}</p>
                {paymentStatus && <p>{paymentStatus}</p>}
             </div>
          )}

          <div className="space-y-3 pt-2">
             {filingMode === 'Monthly' ? (
                <>
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
                </>
             ) : (
                <Button 
                   onClick={() => handleFileReturn('pay_only')}
                   disabled={loading || !grandTotal || !filingPeriod}
                   className="w-full bg-[var(--kra-red)] hover:bg-red-700"
                >
                   Pay TOT
                </Button>
             )}
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
