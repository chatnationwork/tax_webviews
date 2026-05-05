'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { Layout, Card, Button } from '../../_components/Layout';
import { applyTimvExtension, submitCertificate } from '../../actions/customs';

function addDays(isoDate: string, days: number): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const EXTENSION_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '21 days', value: 21 },
  { label: '30 days', value: 30 },
];

function ExtensionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refNo = searchParams.get('ref_no') ?? '';

  const [cert, setCert] = useState<any>(null);
  const [extensionDays, setExtensionDays] = useState(14);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('timv_extension');
    if (!raw || !refNo) {
      router.replace('/timv-extension');
      return;
    }
    const parsed = JSON.parse(raw);
    setCert(parsed.cert);
  }, []);

  const currentExitDate = cert?.vehicle_details?.date_of_exit ?? '';
  const newExitDate = addDays(currentExitDate, extensionDays);

  const handleSubmit = async () => {
    if (!cert) return;
    setSubmitting(true);
    setError('');
    try {
      await applyTimvExtension(cert, extensionDays, newExitDate);
      await submitCertificate(refNo);
      sessionStorage.removeItem('timv_extension');
      router.push(`/timv-extension/result?ref_no=${refNo}&days=${extensionDays}&new_exit=${newExitDate}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit extension. Please try again.');
      setSubmitting(false);
    }
  };

  if (!cert) {
    return (
      <Layout title="Extension Details" showHeader={false}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      </Layout>
    );
  }

  const v = cert.vehicle_details ?? {};

  return (
    <Layout title="Extension Details" showHeader={false}>
      <div className="space-y-5">
        {/* KRA Logo */}
        <div className="flex justify-center pt-4">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-16 w-auto" />
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-base font-bold text-gray-900">Extension Details</h1>
          <p className="text-xs text-gray-500">Ref: {refNo} — {v.vehicle_reg_no}</p>
        </div>

        <Card className="bg-white border-gray-200 p-4 space-y-4">
          {/* Current details */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Current Details</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-500">Entry Date</p>
                <p className="font-medium text-gray-900">{formatDate(v.date_of_entry)}</p>
              </div>
              <div>
                <p className="text-gray-500">Current Exit Date</p>
                <p className="font-medium text-gray-900">{formatDate(currentExitDate)}</p>
              </div>
              <div>
                <p className="text-gray-500">Entry Port</p>
                <p className="font-medium text-gray-900">{v.entry_port}</p>
              </div>
              <div>
                <p className="text-gray-500">Exit Port</p>
                <p className="font-medium text-gray-900">{v.exit_port}</p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Extension period selection */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Extension Period</h3>
            <div className="grid grid-cols-2 gap-2">
              {EXTENSION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExtensionDays(opt.value)}
                  className={`py-2.5 px-3 text-sm font-medium rounded-lg border transition-colors ${
                    extensionDays === opt.value
                      ? 'border-[var(--kra-red)] bg-[var(--kra-red)]/5 text-[var(--kra-red)]'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* New exit date preview */}
          <div className="px-3 py-2.5 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">New Exit Date</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{formatDate(newExitDate)}</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              `Submit Extension (${extensionDays} days)`
            )}
          </Button>
        </Card>

        <button
          onClick={() => router.back()}
          className="w-full py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </Layout>
  );
}

export default function ExtensionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--kra-red)] border-t-transparent rounded-full" />
        </div>
      }
    >
      <ExtensionContent />
    </Suspense>
  );
}
