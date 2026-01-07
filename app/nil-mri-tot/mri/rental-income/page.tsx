'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';
import { 
  fileMriReturn, 
  getProperties, 
  getFilingPeriods, 
  Property, 
  generatePrn, 
  makePayment, 
  getStoredPhone 
} from '@/app/actions/nil-mri-tot';
import { Layout, Card, IdentityStrip, Input, Button, Select, TotalsCard } from '@/app/_components/Layout';


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

  // Filing Period state
  const [periods, setPeriods] = useState<string[]>([]);
  const [filingPeriod, setFilingPeriod] = useState<string>('');
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    
    // Fetch Helpers
    const fetchProperties = async (pin: string) => {
      setLoadingProperties(true);
      try {
        const res = await getProperties(pin);
        if (res.success && res.properties) {
          setProperties(res.properties);
        }
      } catch (err) {
        console.error("Failed to fetch properties", err);
      } finally {
        setLoadingProperties(false);
      }
    };

    const fetchFilingPeriod = async (pin: string) => {
      setLoadingPeriod(true);
      try {
        // Obligation ID 33 is for MRI
        const res = await getFilingPeriods(pin, '33');
        if (res.success && res.periods && res.periods.length > 0) {
          setPeriods(res.periods);
          setFilingPeriod(res.periods[res.periods.length - 1]);
        } 
      } catch (err) {
        console.error("Failed to fetch filing period", err);
       
      } finally {
        setLoadingPeriod(false);
      }
    };

    if (info.pin) {
       fetchProperties(info.pin);
       fetchFilingPeriod(info.pin);
    }

    setMounted(true);
    
    if (!info.idNumber || !info.pin) {
      router.push('/nil-mri-tot/mri/validation');
    }
  }, [router]);

  if (!mounted || !taxpayerInfo?.idNumber) {
    return null;
  }

  const taxRate = 0.1; // 10%
  const mriTax = rentalIncome ? Number(rentalIncome) * taxRate : 0;

  const handleFileReturn = async (withPayment: boolean) => {
    if (!rentalIncome || !filingPeriod) {
        setError("Please enter rental income and select a filing period.");
        return;
    }

    setLoading(true);
    setError('');
    setPaymentStatus('');
    setPrn('');
    
    try {
      // 1. File Return
      const result = await fileMriReturn(
        taxpayerInfo.pin,
        filingPeriod,
        Number(rentalIncome)
      );

      if (!result.success) {
        setError(result.message || 'Failed to file MRI return');
        setLoading(false);
        return;
      }

      // If file-only, redirect
      if (!withPayment) {
          taxpayerStore.setRentalIncome(Number(rentalIncome));
          taxpayerStore.setPaymentType('file-only');
          try {
             (taxpayerStore as any).setReceiptNumber(result.receiptNumber || '');
          } catch (e) {}
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
                // Update store for result page
                taxpayerStore.setRentalIncome(Number(rentalIncome));
                taxpayerStore.setPaymentType('file-and-pay');
                try {
                   (taxpayerStore as any).setReceiptNumber(result.receiptNumber || '');
                } catch (e) {}
                
                setTimeout(() => {
                   router.push('/nil-mri-tot/mri/result');
                }, 2000);
             } else {
                setError(`PRN generated (${prnRes.prn}), but payment failed: ${payRes.message}`);
             }
          } else {
             setError(`PRN generated (${prnRes.prn}), but phone number not found for payment.`);
          }
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred while filing the return');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
      const targetUrl = `/nil-mri-tot/mri/validation${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`;
      router.push(targetUrl);
  };

  return (
    <Layout title="MRI Returns" step="Step 2: Rental Income" onBack={handleBack}>
      <div className="space-y-6">
        {/* Taxpayer Details */}
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

        {/* Filing Period & Properties */}
        <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Declare Rental Income</h2>

            {/* Filing Period Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
               <div className="mb-2">
                  <Select
                    label="Filing Period"
                    options={periods.map(p => ({ value: p, label: p }))}
                    value={filingPeriod}
                    onChange={(val) => setFilingPeriod(val)}
                    disabled={loadingPeriod || periods.length === 0}
                  />
                  {periods.length === 0 && !loadingPeriod && (
                    <p className="text-xs text-red-500 mt-1">No filing periods found.</p>
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
                              <div className="truncate font-mono">{prop.LandlordPIN}</div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            {/* Income Input */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
               <Input
                  label="Total Rental Income (KES)"
                  value={rentalIncome}
                  onChange={setRentalIncome}
                  type="number"
                  placeholder="e.g 50000"
                  required
               />

               {Number(rentalIncome) > 0 && (
                 <TotalsCard
                    subtotal={Number(rentalIncome)}
                    tax={mriTax}
                    total={mriTax}
                 />
               )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {prn && (
               <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">
                  <p className="font-bold">PRN Generated: {prn}</p>
                  {paymentStatus && <p>{paymentStatus}</p>}
               </div>
            )}

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
