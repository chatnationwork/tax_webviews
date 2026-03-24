'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button, DeclarationCheckbox } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { getItrSummary, fileItrReturn } from '@/app/actions/nil-mri-tot';
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
    const fetchSummary = async () => {
      setLoading(true);
      try {
        if (!itrData.taxReturnId) {
          setError('Missing tax return ID. Please go back and try again.');
          setLoading(false);
          return;
        }

        // Prefer pre-computed data from getItrReturn (Phase 1.5) stored during employment-income step
        const preComputed = itrData.taxComputation;
        if (preComputed && Object.keys(preComputed).length > 0 && preComputed.netTaxableIncome !== undefined) {
          setComputation(preComputed);
          setLoading(false);
          return;
        }

        // Fallback: fetch summary from itr-summary/{id}
        const result = await getItrSummary(itrData.taxReturnId);
        if (result.success && result.summary) {
          // Map the summary response to our computation shape
          const data = result.summary;
          const comp: Record<string, number> = {
            totalDeduction: Number(data.total_deduction || 0),
            definedPensionContribution: Number(data.pension_contribution || data.defined_pension_contribution || 0),
            socialHealthInsuranceContribution: Number(data.shif_contribution || data.social_health_insurance || 0),
            housingLevyContribution: Number(data.hl_contribution || data.housing_levy || 0),
            postRetirementMedicalContribution: Number(data.pmf_contribution || data.post_retirement_medical || 0),
            employmentIncome: Number(data.employment_income || data.total_employment_income || 0),
            allowableTaxExemptionDisability: Number(data.disability_exemption || 0),
            netTaxableIncome: Number(data.net_taxable_income || 0),
            taxOnTaxableIncome: Number(data.tax_on_taxable_income || data.total_tax_payable || 0),
            personalRelief: Number(data.personal_relief || 0),
            insuranceRelief: Number(data.insurance_relief || 0),
            taxCredits: Number(data.tax_credits || data.credits || 0),
            payeDeductedFromSalary: Number(data.paye_deducted || data.total_payed_deducted || 0),
            incomeTaxPaidInAdvance: Number(data.income_tax_advance || 0),
            creditsTotalReliefDtaa: Number(data.dtaa_credits || 0),
            taxRefundDue: Number(data.tax_refund_due || data.amount_payable_or_refundable || data.tax_due || 0),
          };
          setComputation(comp);
          taxpayerStore.setItrField('taxComputation', comp);
        } else {
          setError(result.message || 'Failed to load tax summary');
        }
      } catch (e: any) {
        setError(e.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
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
      if (!itrData.taxReturnId) {
        taxpayerStore.setItrField('error', 'Missing tax return ID');
        router.push(`/nil-mri-tot/itr/result${phoneParam}`);
        return;
      }

      // Extract return year from filing period
      let returnYear = new Date().getFullYear() - 1;
      if (itrData.filingPeriod) {
        const yearMatch = itrData.filingPeriod.match(/(\d{4})/g);
        if (yearMatch && yearMatch.length > 0) {
          returnYear = parseInt(yearMatch[0]);
        }
      }

      // Phase 2: Submit the return
      const result = await fileItrReturn(
        itrData.taxReturnId,
        itrData.obligationId,
        itrData.filingPeriod,
        computation?.netTaxableIncome || 0,
        computation?.taxRefundDue || 0,
        taxpayerInfo.pin,
        itrData.taxPayerId || 0,
        {
          returnYear,
          taxCode: '2',
          employeePin: taxpayerInfo.pin,
          totalTaxPayable: computation?.taxOnTaxableIncome || 0,
          totalPayedDeducted: computation?.payeDeductedFromSalary || 0,
          amountPayableOrRefundable: computation?.taxRefundDue || 0,
          pensionContribution: computation?.definedPensionContribution || 0,
          hlContribution: computation?.housingLevyContribution || 0,
          pmfContribution: computation?.postRetirementMedicalContribution || 0,
          shifContribution: computation?.socialHealthInsuranceContribution || 0,
          personalRelief: computation?.personalRelief || 0,
          credits: computation?.taxCredits || 0,
          netTaxableIncome: computation?.netTaxableIncome || 0,
          employmentIncome: itrData.employmentIncomeRows || [],
        }
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

        {/* Step counter — black card, consistent across ITR wizard */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Income Tax Return</h1>
          <p className="text-gray-400 text-xs">Step 3/3 - Tax Computation</p>
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
