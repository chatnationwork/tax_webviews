'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Layout, Button, Card, IdentityStrip } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { Loader2, AlertCircle } from 'lucide-react';
import { getFilingPeriods, getTaxpayerObligations, getStoredPhone, sendWhatsAppMessage } from '@/app/actions/nil-mri-tot';
import { getKnownPhone } from '@/app/_lib/session-store';

function ItrVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  
  const [itrObligation, setItrObligation] = useState<{
    obligationId: string;
    obligationCode: string;
    obligationName: string;
  } | null>(null);
  const [loadingObligations, setLoadingObligations] = useState(false);
  const [filingPeriod, setFilingPeriod] = useState('');
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const ITR_OBLIGATIONS_MOCK = true;

      if (ITR_OBLIGATIONS_MOCK) {
        setItrObligation({
          obligationId: '2',
          obligationCode: 'IT',
          obligationName: 'Individual Income Tax - Resident (ITR)',
        });
        setFilingPeriod('01/01/2024 - 31/12/2024');
        setLoadingObligations(false);
        return;
      }

      try {
        const result = await getTaxpayerObligations(taxpayerInfo.pin);
        if (result.success && result.obligations) {
          const itrObligations = result.obligations.filter(obs =>
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
      const ITR_PERIOD_MOCK = true;

      if (ITR_PERIOD_MOCK) {
        setFilingPeriod('01/01/2024 - 31/12/2024');
        setPeriodError('');
        setLoadingPeriod(false);
        return;
      }

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

  if (!mounted || !taxpayerInfo?.idNumber) {
    return null;
  }

  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';

  const handleFileNilReturn = async () => {
    if (!itrObligation || !filingPeriod) return;
    taxpayerStore.setItrField('obligationId', itrObligation.obligationId);
    taxpayerStore.setItrField('obligationCode', itrObligation.obligationCode);
    taxpayerStore.setItrField('filingPeriod', filingPeriod);
    router.push(`/nil-mri-tot/itr/nil-confirm${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`);
  };

  const handleFileFullReturn = () => {
    if (!itrObligation || !filingPeriod) return;
    taxpayerStore.setItrField('obligationId', itrObligation.obligationId);
    taxpayerStore.setItrField('obligationCode', itrObligation.obligationCode);
    taxpayerStore.setItrField('filingPeriod', filingPeriod);
    router.push(`/nil-mri-tot/itr/return-information${phoneParam}`);
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

  const handleFinish = async (reason: 'no_obligation' | 'no_period') => {
    const storedPhone = await getStoredPhone();
    if (storedPhone && taxpayerInfo) {
      let message: string;

      if (reason === 'no_obligation') {
        message = `Dear ${taxpayerInfo.fullName},

Your PIN: ${taxpayerInfo.pin} does not currently have an Income Tax obligation eligible for ITR filing.

No action is required at this time.`;
      } else {
        message = `Dear ${taxpayerInfo.fullName},

Your PIN: ${taxpayerInfo.pin} currently has no available filing period for Income Tax Return.

No action is required at this time.`;
      }

      await sendWhatsAppMessage({
        recipientPhone: storedPhone,
        message: message,
      });
    }

    router.push('/');
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

            {!itrObligation && (
              <button
                onClick={() => router.push('/nil-mri-tot/itr/validation')}
                className="text-[var(--kra-red)] text-xs font-medium mt-3 hover:underline text-left block"
              >
                Not your profile? Go back to Edit your details
              </button>
            )}
          </div>
        </Card>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <span className="text-amber-600 text-sm">⚠</span>
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Please Note:</span> This return type applies to taxpayers with employment income only.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Income Tax Return obligation</h2>

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
                className="w-full bg-[var(--kra-red)] hover:bg-red-700 mt-4"
              >
                Finish
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
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent('Main menu')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                Back to WhatsApp
              </a>
            </div>
          )}

          {itrObligation && filingPeriod && !periodError && (
            <div className="flex gap-2 flex-col sm:flex-row">
              <Button onClick={handleFileNilReturn} variant="secondary" disabled={loading} className="flex-1">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Filing...</>
                ) : (
                  'File NIL Return'
                )}
              </Button>
              <Button onClick={handleFileFullReturn} className="flex-1" disabled={loading}>
                File Full Return
              </Button>
            </div>
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
