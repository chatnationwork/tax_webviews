'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, FileText, Loader2, AlertTriangle, ChevronDown, ExternalLink } from 'lucide-react';
import { Layout, Card } from '../_components/Layout';
import { getCertificateWithType, getAttachmentUrl } from '../actions/customs';

function formatDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatBytes(bytes: string | number) {
  const n = Number(bytes);
  if (!n) return '';
  return `${(n / 1024).toFixed(2)} KB`;
}

function daysBetween(a: string, b: string) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

function isExtensionAvailable(cert: any) {
  const status: string = (cert?.status ?? '').toLowerCase();
  return status !== 'draft' && status !== '' && status !== 'pending';
}

type Attachment = {
  label: string;
  file: { filename: string; size: string | number; path: string; content_type: string } | null;
};

function AttachmentRow({ label, file, refNo }: { label: string; file: any; refNo: string }) {
  const [opening, setOpening] = useState(false);

  if (!file) return null;

  const handleOpen = async () => {
    setOpening(true);
    const url = await getAttachmentUrl(refNo, file.filename);
    window.open(url, '_blank');
    setOpening(false);
  };

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <p className="text-sm font-medium text-gray-800 mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600">{file.filename}</p>
          <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
        </div>
        <button
          onClick={handleOpen}
          disabled={opening}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {opening ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
          Send to Email
        </button>
      </div>
    </div>
  );
}

function ResultCard({ cert, onApply }: { cert: any; onApply: () => void }) {
  const v = cert.vehicle_details ?? {};
  const t = cert.traveler_details ?? {};
  const extensions: any[] = cert.extensions ?? [];
  const canExtend = isExtensionAvailable(cert);

  const totalDays = daysBetween(v.date_of_entry, t.carnet_expiry_date);
  const remainingDays = daysBetween(v.date_of_exit, t.carnet_expiry_date);

  const attachments: Attachment[] = [
    { label: 'Insurance', file: v.insurance_attachment },
    { label: 'Log Book', file: v.log_book_attachment },
    { label: 'Inspection Certificate', file: v.inspection_certificate_attachment },
    { label: 'Road Safety Licence', file: v.road_safety_licence_attachment },
    { label: 'Owner ID', file: t.owner_id_attachment },
    { label: 'Owner Driving Licence', file: t.owner_driving_license },
    { label: 'Authority Letter', file: t.authority_letter_attachment },
    { label: 'Carnet Document', file: t.carnet_document_attachment },
  ].filter((a) => a.file);

  return (
    <Card className="bg-white border-gray-200">
      {/* Header row */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900">Application No: {cert.ref_no}</h2>
        <button
          onClick={onApply}
          disabled={!canExtend}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            canExtend
              ? 'bg-[var(--kra-red)] text-white hover:bg-[var(--kra-red)]/90'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Apply For Extension
        </button>
      </div>

      {/* Status warning */}
      {!canExtend && (
        <div className="mx-4 mt-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-xs text-orange-700">Extension is not available for this application status</p>
        </div>
      )}

      {/* Details grid */}
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          <span className="text-gray-500">
            Application Type: <span className="text-gray-800 font-medium">TIMV Certificate</span>
          </span>
          <span className="text-gray-500">
            Entry Date: <span className="text-gray-800 font-medium">{formatDate(v.date_of_entry)}</span>
          </span>
          <span className="text-gray-500">
            Exit Date: <span className="text-gray-800 font-medium">{formatDate(v.date_of_exit)}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          <span className="text-gray-500">
            Entry Point: <span className="text-gray-800 font-medium">{v.entry_port}</span>
          </span>
          <span className="text-gray-500">
            Status: <span className="text-gray-800 font-medium">{cert.status}</span>
          </span>
          <span className="text-gray-500">
            Expires in:{' '}
            <span className={`font-medium ${Number(v.period_of_stay) <= 7 ? 'text-red-600' : 'text-gray-800'}`}>
              {v.period_of_stay} days
            </span>
          </span>
          <span className="text-gray-500">
            Applications: <span className="text-gray-800 font-medium">{extensions.length} / ∞</span>
          </span>
        </div>
        {t.carnet_expiry_date && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <span className="text-gray-500">
              Carnet Expiry: <span className="text-gray-800 font-medium">{formatDate(t.carnet_expiry_date)}</span>
            </span>
            {totalDays > 0 && (
              <span className="text-gray-500">
                Days Remaining:{' '}
                <span className={`font-medium ${remainingDays <= 7 ? 'text-red-600' : 'text-gray-800'}`}>
                  {remainingDays} / {totalDays} days
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <>
          <div className="px-4 py-2 bg-gray-50 border-t border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Attachments ({attachments.length})</p>
          </div>
          <div className="px-4">
            {attachments.map((a) => (
              <AttachmentRow key={a.label} label={a.label} file={a.file} refNo={cert.ref_no} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-20 h-20 mb-3 relative">
        <div className="absolute inset-0 bg-gray-200 rounded-full opacity-40" />
        <div className="absolute top-2 left-3 right-3 h-5 bg-gray-300 rounded" />
        <div className="absolute top-9 left-4 right-4 space-y-1.5">
          <div className="h-2 bg-gray-200 rounded" />
          <div className="h-2 bg-gray-200 rounded" />
          <div className="h-2 bg-gray-200 rounded w-3/4 mx-auto" />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">Track By Reference No.</p>
    </div>
  );
}

function TimvExtensionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [refNo, setRefNo] = useState(searchParams.get('ref_no') ?? '');
  const [loading, setLoading] = useState(false);
  const [cert, setCert] = useState<any>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = async (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setCert(null);
    try {
      const res = await getCertificateWithType(trimmed, 'TIMV');
      const data = res?.data ?? res;
      if (!data?.ref_no) throw new Error('No application found for this reference number.');
      setCert(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch application.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = searchParams.get('ref_no');
    if (initial) {
      setRefNo(initial.toUpperCase());
      doSearch(initial);
    }
  }, []);

  const handleSearch = () => doSearch(refNo);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch(refNo);
  };

  const handleApply = () => {
    if (!cert) return;
    sessionStorage.setItem(
      'timv_extension',
      JSON.stringify({ ref_no: cert.ref_no, cert }),
    );
    router.push(`/timv-extension/otp?ref_no=${cert.ref_no}`);
  };

  return (
    <Layout title="TIMV Extension" showHeader={false}>
      <div className="space-y-5">
        {/* KRA Logo */}
        <div className="flex justify-center pt-4">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-16 w-auto" />
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-base font-bold text-gray-900 leading-tight">
            Extension of Temporary Importation of Motor Vehicles Services
          </h1>
          <p className="text-xs text-gray-500">Enter the application reference number below to search</p>
        </div>

        {/* Type dropdown (display only — only TIMV is supported) */}
        <div className="relative">
          <div className="flex items-center justify-between w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 cursor-default">
            <span>Temporary importation of motor vehicle</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Reference number input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={refNo}
            onChange={(e) => setRefNo(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Enter Reference Number"
            className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--kra-red)] ${
              cert ? 'border-[var(--kra-red)]' : 'border-gray-300'
            }`}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !refNo.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[var(--kra-red)] disabled:opacity-40 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Results or empty state */}
        {cert ? (
          <ResultCard cert={cert} onApply={handleApply} />
        ) : !loading && !error ? (
          <EmptyState />
        ) : null}
      </div>
    </Layout>
  );
}

export default function TimvExtensionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--kra-red)] border-t-transparent rounded-full" />
        </div>
      }
    >
      <TimvExtensionContent />
    </Suspense>
  );
}
