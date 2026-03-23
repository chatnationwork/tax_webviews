'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Button, Card } from '@/app/_components/Layout';
import { taxpayerStore } from '@/app/nil-mri-tot/_lib/store';
import { useEffect, useState } from 'react';
import { getFilingPeriods, getTaxpayerObligations, sendWhatsAppMessage, getStoredPhone } from '@/app/actions/nil-mri-tot';
import { Loader2, AlertCircle } from 'lucide-react';

export default function DisclaimerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  
  const [mounted, setMounted] = useState(false);
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [itrObligation, setItrObligation] = useState<{
    obligationId: string;
    obligationCode: string;
    obligationName: string;
  } | null>(null);
  const [loadingObligations, setLoadingObligations] = useState(false);
  const [filingPeriod, setFilingPeriod] = useState('');
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const info = taxpayerStore.getTaxpayerInfo();
    if (!info.idNumber || !info.pin) {
      router.replace(phone ? `/nil-mri-tot/itr/validation?phone=${encodeURIComponent(phone)}` : '/nil-mri-tot/itr/validation');
    } else {
      setTaxpayerInfo(info);
    }
  }, [router, phone]);

  useEffect(() => {
    if (!taxpayerInfo?.pin) return;

    const fetchObligations = async () => {
      setLoadingObligations(true);
      try {
        const result = await getTaxpayerObligations(taxpayerInfo.pin);
        if (result.success && result.obligations) {
          const itrObligations = result.obligations.filter((obs: any) =>
            obs.obligationName.toLowerCase().includes('income tax')
          );
          if (itrObligations.length > 0) {
            const o = itrObligations[0];
            setItrObligation({
              obligationId: o.obligationId,
              obligationCode: o.obligationCode,
              obligationName: o.obligationName,
            });
          } else {
            setItrObligation(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch obligations', err);
      } finally {
        setLoadingObligations(false);
      }
    };

    fetchObligations();
  }, [taxpayerInfo?.pin]);

  useEffect(() => {
    if (!itrObligation || !taxpayerInfo?.pin) {
      setFilingPeriod('');
      return;
    }

    const fetchPeriod = async () => {
      setLoadingPeriod(true);
      setError('');
      try {
        const result = await getFilingPeriods(taxpayerInfo.pin, itrObligation.obligationId);

        if (result.success && result.periods && result.periods.length > 0) {
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
        console.error('Failed to fetch period', err);
      } finally {
        setLoadingPeriod(false);
      }
    };

    fetchPeriod();
  }, [itrObligation, taxpayerInfo?.pin]);

  if (!mounted || !taxpayerInfo) return null;

  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';

  const handleFinish = async (reason: 'no_obligation' | 'no_period') => {
    const storedPhone = await getStoredPhone();
    if (storedPhone && taxpayerInfo) {
      let message: string;

      if (reason === 'no_obligation') {
        message = `Dear ${taxpayerInfo.fullName},\n\nYour PIN: ${taxpayerInfo.pin} does not currently have an Income Tax obligation eligible for ITR filing.\n\nNo action is required at this time.`;
      } else {
        message = `Dear ${taxpayerInfo.fullName},\n\nYour PIN: ${taxpayerInfo.pin} currently has no available filing period for Income Tax Return.\n\nNo action is required at this time.`;
      }

      setLoading(true);
      try {
        await sendWhatsAppMessage({ recipientPhone: storedPhone, message });
      } catch (e) {
        console.error('Failed to send WhatsApp message', e);
      }
      setLoading(false);
    }

    router.push('/');
  };

  const handleNext = () => {
    if (!itrObligation || !filingPeriod) return;
    taxpayerStore.setItrField('obligationId', itrObligation.obligationId);
    taxpayerStore.setItrField('obligationCode', itrObligation.obligationCode);
    taxpayerStore.setItrField('filingPeriod', filingPeriod);
    router.push(`/nil-mri-tot/itr/return-information${phoneParam}`);
  };

  return (
    <Layout
      title="File Tax Return"
      onBack={() => router.push(`/nil-mri-tot/itr/verify${phoneParam}`)}
      showMenu
    >
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-gray-900 leading-tight">
          Important Notice
        </h2>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <span className="text-amber-600 text-lg sm:text-xl mt-0.5">⚠</span>
          <p className="text-sm sm:text-base text-amber-900 leading-relaxed">
            <span className="font-semibold block mb-1">Please Note:</span> 
            This return type applies to taxpayers with <span className="font-semibold">employment income only</span>.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Select obligation</h2>

          {loadingObligations ? (
            <div className="flex items-center text-gray-500 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : !itrObligation ? (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">i</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">No Eligible ITR Filing</p>
                  <p className="text-xs text-gray-700 mt-1">
                    Based on our records, you do not currently have an Income Tax obligation eligible for ITR filing.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleFinish('no_obligation')}
                disabled={loading}
                className="w-full bg-[var(--kra-red)] hover:bg-red-700 mt-4"
              >
                {loading ? 'Finishing...' : 'Finish'}
              </Button>
            </>
          ) : (
            <Card className="p-3 space-y-2">
              <p className="text-xs text-gray-500">Obligation</p>
              <p className="text-sm font-medium text-gray-900">{itrObligation.obligationName}</p>
            </Card>
          )}

          {itrObligation && (
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

          {itrObligation && !loadingPeriod && !filingPeriod && (
            <Button
              onClick={() => handleFinish('no_period')}
              disabled={loading}
              className="w-full bg-[var(--kra-red)] hover:bg-red-700"
            >
              {loading ? 'Finishing...' : 'Finish'}
            </Button>
          )}

          {error && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </div>
          )}

          {itrObligation && filingPeriod && !periodError && (
            <div className="pt-2">
              <Button
                onClick={handleNext}
                className="w-full"
              >
                I Understand, Begin Return
              </Button>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
