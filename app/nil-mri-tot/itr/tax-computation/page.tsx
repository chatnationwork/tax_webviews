'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button, DeclarationCheckbox } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { getItrTaxComputation, fileItrReturn } from '@/app/actions/nil-mri-tot';
import { Loader2, Pencil } from 'lucide-react';

const fmt = (n: number) => `KES ${Math.abs(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

function TaxComputationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const [computation, setComputation] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [certified, setCertified] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const itrData = taxpayerStore.getItrData();
  const taxpayerInfo = taxpayerStore.getTaxpayerInfo();
  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';

  const editableFields: { key: string; label: string }[] = [
    { key: 'definedPensionContribution', label: 'Defined / Pension Contribution' },
    { key: 'socialHealthInsuranceContribution', label: 'Social Health Insurance Contribution' },
    { key: 'housingLevyContribution', label: 'Housing Levy Contribution' },
    { key: 'postRetirementMedicalContribution', label: 'Post-Retirement Medical Contribution' },
  ];

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const result = await getItrTaxComputation(taxpayerInfo.pin, itrData.filingPeriod, itrData.obligationId);
        if (result.success && result.computation) {
          setComputation(result.computation as Record<string, number>);
          taxpayerStore.setItrField('taxComputation', result.computation);
        } else {
          setError(result.message || 'Failed to load tax computation');
        }
      } catch (e: any) {
        setError(e.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleEditSave = (key: string) => {
    if (!computation) return;
    const updated = { ...computation, [key]: Number(editValue) };
    setComputation(updated);
    taxpayerStore.setItrField('taxComputation', updated);
    setEditingField(null);
    setEditValue('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = await fileItrReturn(
        taxpayerInfo.pin,
        itrData.obligationId,
        itrData.obligationCode,
        itrData.filingPeriod,
        itrData.hasInsurancePolicy,
        itrData.insurancePolicies,
        itrData.hasDisabilityExemption,
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

  const ComputationRow = ({ label, value, editable = false, bold = false, fieldKey }: {
    label: string; value: number; editable?: boolean; bold?: boolean; fieldKey?: string;
  }) => (
    <div className={`flex items-center justify-between py-2 border-b border-gray-100 last:border-0 ${bold ? 'font-semibold' : ''}`}>
      <div className="flex items-center gap-2 flex-1">
        <span className={`text-xs ${bold ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>{label}</span>
        {editable && fieldKey && editingField !== fieldKey && (
          <button type="button" onClick={() => { setEditingField(fieldKey); setEditValue(String(value)); }}
            className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
            <Pencil className="w-2.5 h-2.5" /> Click To Edit
          </button>
        )}
      </div>
      {editable && fieldKey && editingField === fieldKey ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-28 px-2 py-1 text-xs border border-[var(--kra-red)] rounded focus:outline-none"
            autoFocus
          />
          <button type="button" onClick={() => handleEditSave(fieldKey)} className="text-[10px] text-green-600 font-medium hover:text-green-800">Save</button>
          <button type="button" onClick={() => setEditingField(null)} className="text-[10px] text-gray-400 hover:text-gray-600">✕</button>
        </div>
      ) : (
        <span className={`text-xs ${bold ? 'text-gray-900 font-semibold' : 'text-gray-800'} ${value < 0 ? 'text-green-600' : ''}`}>
          {value < 0 ? `-${fmt(value)}` : fmt(value)}
        </span>
      )}
    </div>
  );

  return (
    <Layout
      title="File Tax Return"
      onBack={() => router.push(`/nil-mri-tot/itr/employment-income${phoneParam}`)}
      showMenu
    >
      <div className="space-y-4">

        {/* 3-step stepper */}
        <div className="flex items-center justify-between px-2 py-3">
          {[
            { label: 'Return Information', done: true },
            { label: 'Employment Income', done: true },
            { label: 'Tax Computation', done: false, active: true },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.done || step.active ? 'bg-[var(--kra-red)]' : 'border-2 border-gray-300'}`}>
                  {step.done && !step.active ? (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : step.active ? (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  ) : null}
                </div>
                <span className={`text-[10px] font-medium text-center ${step.done || step.active ? 'text-[var(--kra-red)]' : 'text-gray-400'}`}>{step.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`flex-1 h-px mx-2 mb-4 ${step.done ? 'bg-[var(--kra-red)]' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>

        <p className="text-sm font-semibold text-gray-700">Tax Computation</p>

        {loading ? (
          <Card className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--kra-red)]" />
          </Card>
        ) : error ? (
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-xs text-red-600">{error}</p>
          </Card>
        ) : computation ? (
          <Card className="divide-y divide-gray-100">
            <ComputationRow label="Total Deduction" value={computation.totalDeduction} bold />
            {editableFields.map(f => (
              <ComputationRow key={f.key} label={f.label} value={computation[f.key]} editable fieldKey={f.key} />
            ))}
            <ComputationRow label="Total Of Tax Payable Less Reliefs And Exemptions" value={computation.employmentIncome - computation.totalDeduction} bold />
            <ComputationRow label="Employment Income" value={computation.employmentIncome} />
            <ComputationRow label="Allowable Tax Exemption — Person With Disability" value={computation.allowableTaxExemptionDisability} />
            <ComputationRow label="Net Taxable Income" value={computation.netTaxableIncome} />
            <ComputationRow label="Tax On Taxable Income" value={computation.taxOnTaxableIncome} />
            <ComputationRow label="Personal Relief" value={computation.personalRelief} />
            <ComputationRow label="Insurance Relief" value={computation.insuranceRelief} />
            <ComputationRow label="Tax Credits" value={computation.taxCredits} bold />
            <ComputationRow label="PAYE Deducted From Salary" value={computation.payeDeductedFromSalary} />
            <ComputationRow label="Income Tax Paid In Advance" value={computation.incomeTaxPaidInAdvance} />
            <ComputationRow label="Credits (Total Relief From DTAA Credits)" value={computation.creditsTotalReliefDtaa} />
            <div className="py-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">Tax /(Refund) Due</span>
              <span className={`text-sm font-bold ${computation.taxRefundDue < 0 ? 'text-green-600' : 'text-[var(--kra-red)]'}`}>
                {computation.taxRefundDue < 0 ? `-${fmt(computation.taxRefundDue)}` : fmt(computation.taxRefundDue)}
              </span>
            </div>
          </Card>
        ) : null}

        {/* Certification */}
        {!loading && !error && computation && (
          <DeclarationCheckbox
            label="I certify that the information given in this return is correct and complete. I acknowledge and understand that the filing of this return will be deemed to be an assessment of Tax and that I am liable to pay the assessed amount of tax at the return is submitted."
            checked={certified}
            onChange={(e) => setCertified(e.target.checked)}
          />
        )}

        {/* Navigation */}
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={() => { taxpayerStore.clear(); router.push('/nil-mri-tot'); }} className="flex-1">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!certified || submitting || loading}
            className="flex-1"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Submitting...</> : 'Submit'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function TaxComputationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <TaxComputationContent />
    </Suspense>
  );
}
