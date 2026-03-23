'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Layout, Button, Card, IdentityStrip } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { getStoredPhone } from '@/app/actions/nil-mri-tot';
import { getKnownPhone } from '@/app/_lib/session-store';
import { Loader2 } from 'lucide-react';

function ItrVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    if (!info.idNumber) {
      router.push('/nil-mri-tot/itr/validation');
    }
  }, [router]);



  if (!mounted || !taxpayerInfo?.idNumber) {
    return null;
  }

  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';



  const handleNext = () => {
    router.push(`/nil-mri-tot/itr/disclaimer${phoneParam}`);
  };

  const handleBack = async () => {
    if (phone) {
      router.push(`/nil-mri-tot/itr/validation?phone=${encodeURIComponent(phone)}`);
      return;
    }
    const storedPhone = await getStoredPhone();
    if (storedPhone) {
      router.push(`/nil-mri-tot/itr/validation?phone=${encodeURIComponent(storedPhone)}`);
    } else {
      try {
        const localPhone = getKnownPhone();
        if (localPhone) {
          router.push(`/nil-mri-tot/itr/validation?phone=${encodeURIComponent(localPhone)}`);
        } else {
          router.push('/nil-mri-tot/itr/validation');
        }
      } catch (e) {
        router.push('/nil-mri-tot/itr/validation');
      }
    }
  };



  return (
    <Layout title="Back to Taxpayer Validation" onBack={handleBack} showMenu>
      <div className="space-y-6">
        <div>
          <h1 className="text-sm font-semibold text-gray-800">Review Details &amp; Obligation</h1>
        </div>

        <Card className="p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Taxpayer Details Preview</h2>
            <div className="space-y-1">
              <IdentityStrip label="Name" value={taxpayerInfo.fullName} />
              <IdentityStrip label="ID Number" value={taxpayerInfo.idNumber} />
              <IdentityStrip label="PIN" value={taxpayerInfo.pin} />
            </div>

            {/* {!itrObligation && ( */}
              <button
                onClick={() => router.push('/nil-mri-tot/itr/validation')}
                className="text-[var(--kra-red)] text-xs font-medium mt-3 hover:underline text-left block"
              >
                Not your profile? Go back to Edit your details
              </button>
            {/* )} */}
          </div>
        </Card>



        <div className="pt-2">
          <Button onClick={handleNext} className="w-full">
            Next
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function ItrVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <ItrVerifyContent />
    </Suspense>
  );
}
