'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, FileText } from 'lucide-react';
import { Layout, Card, Button } from '../../_components/Layout';
import { StepIndicator } from '../_components/StepIndicator';
import { AcknowledgementModal } from '../_components/AcknowledgementModal';
import { getCertSession } from '../../_lib/cert-store';
import { getCertificate, submitCertificate } from '../../actions/customs';

function PreviewRow({ label, value }: { label: string; value?: string | null }) {
  if (!value && value !== '0') return null;
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 w-2/5 shrink-0">{label}</span>
      <span className="text-xs text-gray-900 text-right flex-1 break-words">{value}</span>
    </div>
  );
}

function FileRow({ label, value }: { label: string; value?: any }) {
  if (!value) return null;
  const name = value.filename ?? value.path ?? 'Attached';
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 w-2/5 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <FileText className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-600 truncate max-w-[140px]">{name}</span>
      </div>
    </div>
  );
}

function TIMVPreviewContent() {
  const router = useRouter();
  const [session] = useState(() => getCertSession());
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session?.ref_no) {
      router.replace('/timv');
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const res = await getCertificate(session.ref_no);
        setCert(res?.data ?? res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load application details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session, router]);

  const handleSubmit = async () => {
    await submitCertificate(session!.ref_no);
    router.push('/timv/result');
  };

  if (!session?.ref_no) return null;

  const vd = cert?.vehicle_details ?? {};
  const td = cert?.traveler_details ?? {};

  return (
    <Layout
      title="TIMV — Preview"
      step="Step 3 of 3"
      onBack={() => router.push('/timv/traveler')}
      showMenu
    >
      <div className="space-y-4">
        <StepIndicator current={3} labels={['Importation', 'Traveler', 'Preview']} />

        {loading ? (
          <Card className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--kra-red)]" />
          </Card>
        ) : error ? (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        ) : (
          <>
            <Card className="p-0">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Application</p>
              </div>
              <div className="px-4 pb-1">
                <PreviewRow label="Reference" value={cert?.ref_no} />
                <PreviewRow label="Type" value={cert?.type} />
                <PreviewRow label="Status" value={cert?.status} />
              </div>
            </Card>

            <Card className="p-0">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Vehicle &amp; Travel Details</p>
              </div>
              <div className="px-4 pb-1">
                <PreviewRow label="Reg Number" value={vd.vehicle_reg_no} />
                <PreviewRow label="Make" value={vd.make} />
                <PreviewRow label="Model" value={vd.model} />
                <PreviewRow label="Year" value={vd.year_of_manufacture} />
                <PreviewRow label="Colour" value={vd.color} />
                <PreviewRow label="Chassis No" value={vd.chassis_no} />
                <PreviewRow label="Engine No" value={vd.engine_no} />
                <PreviewRow label="Fuel Type" value={vd.fuel_type} />
                <PreviewRow label="Reg Country" value={vd.registration_country} />
                <PreviewRow label="Entry Port" value={vd.entry_port} />
                <PreviewRow label="Exit Port" value={vd.exit_port} />
                <PreviewRow label="Date of Entry" value={vd.date_of_entry} />
                <PreviewRow label="Date of Exit" value={vd.date_of_exit} />
                <PreviewRow label="Period of Stay" value={vd.period_of_stay ? `${vd.period_of_stay} days` : undefined} />
                <PreviewRow label="Dest. County" value={vd.destination_county} />
                <PreviewRow label="Dest. Town" value={vd.destination_town} />
                <PreviewRow label="With Trailer" value={vd.with_trailer} />
                <PreviewRow label="Trailer Reg No" value={vd.trailer_reg_no} />
                <FileRow label="Logbook" value={vd.log_book_attachment} />
                <FileRow label="Insurance" value={vd.insurance_attachment} />
              </div>
            </Card>

            <Card className="p-0">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Traveler Details</p>
              </div>
              <div className="px-4 pb-1">
                <PreviewRow label="Owner Name" value={td.owner_name} />
                <PreviewRow label="Nationality" value={td.owner_nationality} />
                <PreviewRow label="Passport/ID" value={td.owner_passport} />
                <PreviewRow label="Phone" value={td.owner_phone} />
                <PreviewRow label="Email" value={td.owner_email} />
                <PreviewRow label="Owner is Driver" value={td.is_owner} />
                {td.is_owner === 'no' && (
                  <>
                    <PreviewRow label="Driver Name" value={td.driver_name} />
                    <PreviewRow label="Driver Nationality" value={td.driver_nationality} />
                    <PreviewRow label="Driver Passport" value={td.driver_passport} />
                  </>
                )}
                <PreviewRow label="Carnet" value={td.is_carnet} />
                {td.is_carnet === 'yes' && (
                  <>
                    <PreviewRow label="Carnet No" value={td.carnet_no} />
                    <PreviewRow label="Carnet Expiry" value={td.carnet_expiry_date} />
                    <PreviewRow label="Issuing Country" value={td.issuing_country} />
                  </>
                )}
                <PreviewRow label="Accessories" value={td.has_accessories} />
                <FileRow label="Owner ID" value={td.owner_id_attachment} />
                <FileRow label="Driver ID" value={td.driver_id_attachment} />
                <FileRow label="Driver Licence" value={td.driver_driving_licence} />
                <FileRow label="Carnet Doc" value={td.carnet_document_attachment} />
              </div>
            </Card>
          </>
        )}

        {!loading && !error && (
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => router.push('/timv/traveler')} className="flex-1">
              Back
            </Button>
            <Button onClick={() => setModalOpen(true)} className="flex-1">
              Submit Application
            </Button>
          </div>
        )}
      </div>

      <AcknowledgementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSubmit}
      />
    </Layout>
  );
}

export default function TIMVPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      }
    >
      <TIMVPreviewContent />
    </Suspense>
  );
}
