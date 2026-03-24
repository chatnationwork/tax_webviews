'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Layout, Button, Card, IdentityStrip } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { getStoredPhone, getTaxpayerObligations, sendWhatsAppMessage } from '@/app/actions/nil-mri-tot';
import { getKnownPhone } from '@/app/_lib/session-store';
import { Loader2, AlertCircle } from 'lucide-react';

function ItrVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [loadingObligations, setLoadingObligations] = useState(false);
  const [hasItrObligation, setHasItrObligation] = useState<boolean | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);
    
    if (!info.idNumber) {
      router.push('/nil-mri-tot/itr/validation');
    }
  }, [router]);

  useEffect(() => {
    if (!taxpayerInfo?.pin) return;

    const fetchObligations = async () => {
      setLoadingObligations(true);
      try {
        const result = await getTaxpayerObligations(taxpayerInfo.pin);
        if (result.success && result.obligations) {
          const hasItr = result.obligations.some((obs: any) =>
            obs.obligationName?.toLowerCase().includes('income tax')
          );
          setHasItrObligation(hasItr);
        } else {
          setHasItrObligation(false);
        }
      } catch (error) {
        console.error('Failed to fetch obligations', error);
        setHasItrObligation(false);
      } finally {
        setLoadingObligations(false);
      }
    };

    fetchObligations();
  }, [taxpayerInfo?.pin]);



  if (!mounted || !taxpayerInfo?.idNumber) {
    return null;
  }

  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';



  const handleNext = () => {
    if (!hasItrObligation) return;
    router.push(`/nil-mri-tot/itr/disclaimer${phoneParam}`);
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const storedPhone = taxpayerStore.getMsisdn() || await getStoredPhone() || getKnownPhone();
      if (storedPhone && taxpayerInfo?.pin) {
        const message = `Dear ${taxpayerInfo.fullName},\n\nYour PIN: ${taxpayerInfo.pin} does not currently have an Income Tax obligation eligible for ITR filing.\n\nNo action is required at this time.`;
        await sendWhatsAppMessage({ recipientPhone: storedPhone, message });
      }
    } catch (error) {
      console.error('Failed to send WhatsApp notification', error);
    } finally {
      setFinishing(false);
      router.push('/');
    }
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
          {loadingObligations ? (
            <div className="flex items-center justify-center py-3 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : hasItrObligation === false ? (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">No Eligible ITR Filing</p>
                  <p className="text-xs text-gray-700 mt-1">
                    Based on our records, you do not currently have an Income Tax obligation eligible for ITR filing.
                  </p>
                </div>
              </div>
              <Button onClick={handleFinish} disabled={finishing} className="w-full bg-[var(--kra-red)] hover:bg-red-700">
                {finishing ? 'Finishing...' : 'Finish'}
              </Button>
            </div>
          ) : (
            <Button onClick={handleNext} className="w-full">
              Next
            </Button>
          )}
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
