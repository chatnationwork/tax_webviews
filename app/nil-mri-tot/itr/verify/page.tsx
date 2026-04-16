'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Layout, Button, Card, IdentityStrip, Select } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { getStoredPhone, getTaxpayerObligations, getItrFilingPeriods, getItrConfig, sendWhatsAppMessage } from '@/app/actions/nil-mri-tot';
import { getKnownPhone } from '@/app/_lib/session-store';
import { Loader2, AlertCircle } from 'lucide-react';

function ItrVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');

  const [taxpayerInfo, setTaxpayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Obligations
  const [obligations, setObligations] = useState<
    Array<{ obligationId: string; obligationCode: string; obligationName: string }>
  >([]);
  const [selectedObligationId, setSelectedObligationId] = useState('');
  const [loadingObligations, setLoadingObligations] = useState(false);
  const [obligationsMessage, setObligationsMessage] = useState('');

  // Filing period
  const [filingPeriod, setFilingPeriod] = useState('');
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState('');

  const [error, setError] = useState('');

  const itrObligation = obligations.find((o) => o.obligationId === selectedObligationId) ?? null;

  useEffect(() => {
    const info = taxpayerStore.getTaxpayerInfo();
    setTaxpayerInfo(info);
    setMounted(true);

    if (!info.idNumber) {
      router.push('/nil-mri-tot/itr/validation');
    }
  }, [router]);

  // Fetch obligations + ITR config in parallel once we have a PIN
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
          setObligations(
            itrObligations.map((o: any) => ({
              obligationId: o.obligationId,
              obligationCode: o.obligationCode,
              obligationName: o.obligationName,
            }))
          );
          if (itrObligations.length === 0) {
            setObligationsMessage(result.message || '');
          }
          // Auto-select if exactly one ITR obligation
          if (itrObligations.length === 1) {
            setSelectedObligationId(itrObligations[0].obligationId);
          }
        } else {
          setObligations([]);
          setObligationsMessage(result.message || '');
        }
      } catch (err) {
        console.error('Failed to fetch obligations', err);
        setObligations([]);
      } finally {
        setLoadingObligations(false);
      }
    };

    fetchObligations();

    getItrConfig()
      .then((cfg) => {
        if (cfg.success && cfg.config) {
          taxpayerStore.setItrField('itrConfig', cfg.config);
        }
      })
      .catch(() => {});
  }, [taxpayerInfo?.pin]);

  // Auto-fetch filing period when obligation is selected
  useEffect(() => {
    if (!selectedObligationId || !taxpayerInfo?.pin) {
      setFilingPeriod('');
      setPeriodError('');
      return;
    }

    const fetchPeriod = async () => {
      setLoadingPeriod(true);
      setFilingPeriod('');
      setPeriodError('');
      setError('');
      try {
        const result = await getItrFilingPeriods(taxpayerInfo.pin, selectedObligationId);
        if (result.success && result.periods && result.periods.length > 0) {
          setFilingPeriod(result.periods[0]);
        } else {
          const msg = result.message;
          setPeriodError(typeof msg === 'string' ? msg : 'No filing period available');
        }
      } catch (err) {
        console.error('Failed to fetch period', err);
        setPeriodError('Failed to fetch filing period');
      } finally {
        setLoadingPeriod(false);
      }
    };

    fetchPeriod();
  }, [selectedObligationId, taxpayerInfo?.pin]);

  if (!mounted || !taxpayerInfo?.idNumber) return null;

  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';

  const handleFinish = async (reason: 'no_obligation' | 'no_period') => {
    setFinishing(true);
    try {
      const storedPhone = taxpayerStore.getMsisdn() || await getStoredPhone() || getKnownPhone();
      if (storedPhone && taxpayerInfo) {
        const message =
          reason === 'no_obligation'
            ? `Dear ${taxpayerInfo.fullName},\n\nYour PIN: ${taxpayerInfo.pin} does not currently have an Income Tax obligation eligible for ITR filing.\n\nNo action is required at this time.`
            : `Dear ${taxpayerInfo.fullName},\n\nYour PIN: ${taxpayerInfo.pin} currently has no available filing period for Income Tax Return.\n\nNo action is required at this time.`;
        await sendWhatsAppMessage({ recipientPhone: storedPhone, message });
      }
    } catch (e) {
      console.error('Failed to send WhatsApp message', e);
    } finally {
      setFinishing(false);
      router.push('/');
    }
  };

  const handleBeginReturn = () => {
    if (!itrObligation || !filingPeriod) return;
    taxpayerStore.setItrField('obligationId', itrObligation.obligationId);
    taxpayerStore.setItrField('obligationCode', itrObligation.obligationCode);
    taxpayerStore.setItrField('filingPeriod', filingPeriod);
    router.push(`/nil-mri-tot/itr/employment-income${phoneParam}`);
  };

  const handleBack = async () => {
    const p = phone || await getStoredPhone() || getKnownPhone();
    router.push(p ? `/nil-mri-tot/itr/validation?phone=${encodeURIComponent(p)}` : '/nil-mri-tot/itr/validation');
  };

  const obligationsResolved = !loadingObligations;
  const hasNoObligations = obligationsResolved && obligations.length === 0;
  const hasNoFilingPeriod = selectedObligationId && !loadingPeriod && !filingPeriod;
  const readyToBegin = !!itrObligation && !!filingPeriod && !periodError;

  return (
    <Layout title="Back to Taxpayer Validation" onBack={handleBack} showMenu>
      <div className="space-y-5">
        {/* Taxpayer details */}
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Taxpayer Details</h2>
          <div className="space-y-1">
            <IdentityStrip label="Name" value={taxpayerInfo.fullName} />
            <IdentityStrip label="ID Number" value={taxpayerInfo.idNumber} />
            <IdentityStrip label="PIN" value={taxpayerInfo.pin} />
          </div>
          <button
            onClick={() => router.push('/nil-mri-tot/itr/validation')}
            className="text-[var(--kra-red)] text-xs font-medium mt-3 hover:underline text-left block"
          >
            Not your profile? Go back to Edit your details
          </button>
        </Card>

        {/* Obligation & Filing Period */}
        <div className="space-y-3">
          {loadingObligations ? (
            <div className="flex items-center text-gray-500 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Checking obligations...</span>
            </div>
          ) : hasNoObligations ? (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">No Eligible ITR Filing</p>
                  <p className="text-xs text-gray-700 mt-1">
                    {obligationsMessage || 'Based on our records, you do not currently have an Income Tax obligation eligible for ITR filing.'}
                  </p>
                </div>
              </div>
              <Button onClick={() => handleFinish('no_obligation')} disabled={finishing} className="w-full bg-[var(--kra-red)] hover:bg-red-700">
                {finishing ? 'Finishing...' : 'Finish'}
              </Button>
            </>
          ) : obligations.length > 1 ? (
            <Select
              label="Select Obligation"
              value={selectedObligationId}
              onChange={setSelectedObligationId}
              required
              options={obligations.map((o) => ({ value: o.obligationId, label: o.obligationName }))}
            />
          ) : (
            <div className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-xs text-gray-500">Obligation:</span>{' '}
              <span className="font-medium text-gray-900">{obligations[0]?.obligationName}</span>
            </div>
          )}

          {/* Filing period */}
          {selectedObligationId && (
            <div className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
              {loadingPeriod ? (
                <div className="flex items-center text-gray-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Loading filing period...</span>
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
                    <p className="font-medium text-sm">No Filing Period Available</p>
                    <p className="text-xs mt-1">{periodError || 'There is no available filing period for this obligation.'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {hasNoFilingPeriod && (
            <Button onClick={() => handleFinish('no_period')} disabled={finishing} className="w-full bg-[var(--kra-red)] hover:bg-red-700">
              {finishing ? 'Finishing...' : 'Finish'}
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        {readyToBegin && (
          <>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <span className="text-amber-600 text-lg mt-0.5">⚠</span>
              <p className="text-sm text-amber-900 leading-relaxed">
                <span className="font-semibold block mb-1">Please Note:</span>
                This return type applies to taxpayers with <span className="font-semibold">employment income only</span>.
              </p>
            </div>

            <Button onClick={handleBeginReturn} className="w-full">
              I Understand, Begin Return
            </Button>
          </>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
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
