
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Download } from 'lucide-react';
import { taxpayerStore } from '../../_lib/store';
import { Layout, Card, IdentityStrip, Button } from '@/app/_components/Layout';
import { Liability } from '@/app/actions/nil-mri-tot';

function LiabilitiesResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    const libs = (taxpayerStore as any).getLiabilities();
    
    setTaxpayerInfo(info);
    if (libs) {
        setLiabilities(libs);
    }
    setMounted(true);
    
    if (!info.pin) {
       // If no PIN, maybe redirect back or handle gracefully
       // router.push('/nil-mri-tot/mri/rental-income'); 
    }
  }, []);

  const handleBack = () => {
    const targetUrl = `/nil-mri-tot/mri/rental-income${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`;
    router.push(targetUrl);
  };

  if (!mounted) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      );
  }

  const totalLiability = liabilities.reduce((sum, item) => sum + Number(item.TotalAmount.replace(/,/g, '')), 0);

  return (
    <Layout title="Payment Summary" onBack={handleBack} showMenu>
      <div className="space-y-6">
        {/* Taxpayer Details */}
        <Card className="p-4 space-y-4">
           <div>
             <h2 className="text-sm font-semibold text-gray-800 mb-2">Taxpayer Details</h2>
             <div className="space-y-1">
               <IdentityStrip label="Name" value={taxpayerInfo?.fullName || 'Unknown'} />
               <IdentityStrip label="PIN" value={taxpayerInfo?.pin || 'Unknown'} />
             </div>
           </div>
        </Card>

        {/* Liabilities List */}
        <div>
           <h3 className="text-sm font-medium text-gray-700 mb-2">Outstanding Liabilities</h3>
           
           {liabilities.length === 0 ? (
               <Card className="p-8 text-center text-gray-500">
                   <p>No outstanding liabilities found.</p>
               </Card>
           ) : (
               <div className="space-y-3">
                   {liabilities.map((item, index) => (
                       <Card key={index} className="p-4 border border-gray-200">
                           <div className="flex justify-between items-start mb-2">
                               <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                   {item.TaxPeriodFrom} - {item.TaxPeriodTo}
                               </span>
                               <span className="text-sm font-bold text-[var(--kra-red)]">
                                   KES {Number(item.TotalAmount).toLocaleString()}
                               </span>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                               <div>Principal: <span className="font-mono">{item.PrincipalAmount}</span></div>
                               <div>Penalty: <span className="font-mono">{item.PenaltyAmount}</span></div>
                               <div>Interest: <span className="font-mono">{item.InterestAmount}</span></div>
                               <div>Fine: <span className="font-mono">{item.FineAmount}</span></div>
                           </div>
                       </Card>
                   ))}
                   
                   <div className="bg-gray-900 text-white p-4 rounded-lg flex justify-between items-center shadow-lg">
                       <span className="font-medium">Total Payable</span>
                       <span className="text-lg font-bold">KES {totalLiability.toLocaleString()}</span>
                   </div>
               </div>
           )}
        </div>

        {/* Actions */}
        <div className="pt-4">
            <Button
                onClick={handleBack}
                variant="secondary"
                className="w-full"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Rental Income
            </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function LiabilitiesResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <LiabilitiesResultContent />
    </Suspense>
  );
}
