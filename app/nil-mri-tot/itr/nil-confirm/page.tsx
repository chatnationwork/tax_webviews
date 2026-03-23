'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button, DeclarationCheckbox } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { fileItrNilReturn } from '@/app/actions/nil-mri-tot';
import { Loader2 } from 'lucide-react';

function NilConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';

  const [certified, setCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const taxpayerInfo = taxpayerStore.getTaxpayerInfo();
  const itrData = taxpayerStore.getItrData();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await fileItrNilReturn(
        taxpayerInfo.pin,
        itrData.obligationCode,
        itrData.filingPeriod,
      );
      if (result.success) {
        taxpayerStore.setItrField('receiptNumber', result.receiptNumber || '');
        taxpayerStore.setItrField('successMessage', result.message);
        taxpayerStore.setItrField('error', undefined);
      } else {
        taxpayerStore.setItrField('error', result.message);
      }
      router.push(`/nil-mri-tot/itr/result${phoneParam}`);
    } catch (e: any) {
      taxpayerStore.setItrField('error', e.message || 'Unexpected error');
      router.push(`/nil-mri-tot/itr/result${phoneParam}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/nil-mri-tot/itr/verify${phoneParam}`);
  };

  const SummaryRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );

  return (
    <Layout
      title="File Tax Return"
      onBack={handleCancel}
      showMenu
    >
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Confirm Details</h2>

        {/* About Tax Payer */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">About Tax Payer</h3>
          <SummaryRow label="KRA PIN" value={taxpayerInfo.pin} />
          <SummaryRow label="Full Name" value={taxpayerInfo.fullName} />
        </Card>

        {/* Return Summary */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Return Summary</h3>
          <SummaryRow label="Obligation" value="Individual Income Tax - Resident (ITR)" />
          <SummaryRow label="Type of return" value="Original" />
          <SummaryRow label="Return Period" value={itrData.filingPeriod} />
          <SummaryRow label="Tax /(Refund) Due" value="KES 0" />
          <SummaryRow label="Total Tax Due" value="KES 0" />
        </Card>

        {/* Declaration */}
        <DeclarationCheckbox
          label="I certify that the information given in this return is correct and complete. I acknowledge and understand that the filing of this return will be deemed to be an assessment of Tax and that I am liable to pay the assessed amount of tax at the return is submitted."
          checked={certified}
          onChange={(e) => setCertified(e.target.checked)}
        />

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!certified || submitting}
            className="flex-1"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Submitting...</>
              : 'Submit'
            }
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function NilConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    }>
      <NilConfirmContent />
    </Suspense>
  );
}
