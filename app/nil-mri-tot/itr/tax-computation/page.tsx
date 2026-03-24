'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button, DeclarationCheckbox } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { createItrReturn, getItrReturn, getItrSummary, fileItrReturn } from '@/app/actions/nil-mri-tot';
import { Loader2, Pencil } from 'lucide-react';

const fmt = (n: number) => `KES ${Math.abs(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Map the flat summary response from GET /api/tax-return/itr-summary/{id} */
function mapSummaryToComputation(data: Record<string, any>): Record<string, number> {
  return {
    totalDeduction: toNumber(data.total_deduction),
    definedPensionContribution: toNumber(data.defined_pension_contribution ?? data.pension_contribution),
    socialHealthInsuranceContribution: toNumber(data.shif_contribution),
    housingLevyContribution: toNumber(data.hl_contribution),
    postRetirementMedicalContribution: toNumber(data.pmf_contribution),
    mortgageInterest: toNumber(data.mortgage_interest),
    depositInHomeOwnershipSavingPlan: toNumber(data.deposit_in_home_ownership_saving_plan),
    employmentIncome: toNumber(data.employment_income),
    allowableTaxExemptionDisability: toNumber(data.allowable_tax_exemption_incase_of_person_with_disability ?? data.disability_exemption),
    netTaxableIncome: toNumber(data.net_taxable_income),
    taxOnTaxableIncome: toNumber(data.tax_on_taxable_income),
    totalOfTaxPayableLessReliefsAndExemptions: toNumber(data.total_of_tax_payable_less_reliefs_and_exemptions),
    personalRelief: toNumber(data.personal_relief),
    insuranceRelief: toNumber(data.insurance_relief),
    taxCredits: toNumber(data.tax_credits),
    payeDeductedFromSalary: toNumber(data.paye_deducted_from_salary),
    incomeTaxPaidInAdvance: toNumber(data.income_tax_paid_in_advance),
    creditsTotalReliefDtaa: toNumber(data.credits),
    taxRefundDue: toNumber(data.tax_due_refund_due ?? data.tax_due ?? data.amount_payable_or_refundable),
  };
}

/**
 * Compute the tax summary client-side from the draft + employment income data.
 * Used as a fallback when itr-summary endpoint is not yet available for the draft.
 */
function computeFromDraftData(createResponseData: any): Record<string, number> {
  const itr = taxpayerStore.getItrData();
  const rows = itr.employmentIncomeRows || [];
  const summary = itr.employmentIncomeSummary;

  const pension = itr.pensionContribution;
  const shif = itr.shifContribution;
  const hl = itr.hlContribution;
  const pmf = itr.pmfContribution;
  const mortgageInterest = (itr.mortgages || []).reduce((sum, m) => sum + (m.interestAmountPaid || 0), 0);

  const totalDeduction = pension + shif + hl + pmf + mortgageInterest;
  const employmentIncome = rows.reduce((sum, r) => sum + r.totalEmploymentIncome, 0);
  const netTaxableIncome = Math.max(0, employmentIncome - totalDeduction);

  // Use the server-computed tax from the employment income response
  const taxOnTaxableIncome = summary?.totalTaxPayable ?? rows.reduce((sum, r) => sum + r.taxPayableOnTaxableSalary, 0);
  const personalRelief = summary?.personalRelief ?? 28800;
  const insuranceRelief = itr.hasInsurancePolicy
    ? itr.insurancePolicies.reduce((sum, p) => sum + (p.amountOfInsuranceRelief || 0), 0)
    : 0;

  const payeDeducted = summary?.totalPAYEDeducted ?? rows.reduce((sum, r) => sum + r.amountOfTaxDeductedPaye, 0);
  const totalOfTaxPayableLessReliefsAndExemptions = taxOnTaxableIncome - personalRelief - insuranceRelief;
  const taxCredits = payeDeducted;
  const taxRefundDue = totalOfTaxPayableLessReliefsAndExemptions - taxCredits;

  return {
    totalDeduction,
    definedPensionContribution: pension,
    socialHealthInsuranceContribution: shif,
    housingLevyContribution: hl,
    postRetirementMedicalContribution: pmf,
    mortgageInterest,
    depositInHomeOwnershipSavingPlan: 0,
    employmentIncome,
    allowableTaxExemptionDisability: 0,
    netTaxableIncome,
    taxOnTaxableIncome,
    totalOfTaxPayableLessReliefsAndExemptions,
    personalRelief,
    insuranceRelief,
    taxCredits,
    payeDeductedFromSalary: payeDeducted,
    incomeTaxPaidInAdvance: 0,
    creditsTotalReliefDtaa: 0,
    taxRefundDue,
  };
}

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

  const editableFields: { key: string; storeKey: keyof typeof itrData; label: string }[] = [
    { key: 'definedPensionContribution', storeKey: 'pensionContribution', label: 'Defined / Pension Contribution' },
    { key: 'socialHealthInsuranceContribution', storeKey: 'shifContribution', label: 'Social Health Insurance Contribution' },
    { key: 'housingLevyContribution', storeKey: 'hlContribution', label: 'Housing Levy Contribution' },
    { key: 'postRetirementMedicalContribution', storeKey: 'pmfContribution', label: 'Post-Retirement Medical Contribution' },
  ];

  /** Build the create-return payload from current store state */
  const buildCreatePayload = useCallback(() => {
    const data = taxpayerStore.getItrData();
    return {
      pin: taxpayerInfo.pin,
      period: data.filingPeriod,
      returnType: 'normal',
      pensionContribution: data.pensionContribution,
      shifContribution: data.shifContribution,
      hlContribution: data.hlContribution,
      pmfContribution: data.pmfContribution,
      insurancePolicies: data.hasInsurancePolicy ? data.insurancePolicies : [],
      disabilityCertificates: data.disabilityCertificates || [],
      employmentIncome: data.employmentIncomeRows,
      mortgages: data.mortgages || [],
    };
  }, [taxpayerInfo.pin]);

  /** Create/update the return draft, then get the computed summary (server or fallback) */
  const createAndFetchSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const createResult = await createItrReturn(buildCreatePayload());
      if (!createResult.success) {
        setError(createResult.message || 'Failed to create ITR return');
        return;
      }

      const taxReturnId = createResult.taxReturnId;
      const taxPayerId = createResult.taxPayerId;
      const taxObligationId = createResult.taxObligationId;
      if (!taxReturnId) {
        setError('Backend did not return a tax return ID');
        return;
      }

      taxpayerStore.setItrField('taxReturnId', taxReturnId);
      if (taxPayerId) taxpayerStore.setItrField('taxPayerId', taxPayerId);
      if (taxObligationId) taxpayerStore.setItrField('taxObligationId', taxObligationId);

      // Try to trigger the backend computation via getItrReturn
      const currentItr = taxpayerStore.getItrData();
      let itrReturnData: any = null;
      if (taxPayerId && taxObligationId && currentItr.filingPeriod) {
        const itrResult = await getItrReturn(taxPayerId, taxObligationId, currentItr.filingPeriod);
        if (itrResult.success) itrReturnData = itrResult.rawData;
      }

      // Strategy 1: Try itr-summary (works for published/processed returns)
      const summaryResult = await getItrSummary(taxReturnId);
      if (summaryResult.success && summaryResult.summary) {
        const comp = mapSummaryToComputation(summaryResult.summary);
        setComputation(comp);
        taxpayerStore.setItrField('taxComputation', comp as any);
        return;
      }

      // Strategy 2: Use getItrReturn meta_data if it was populated
      if (itrReturnData?.meta_data) {
        const meta = itrReturnData.meta_data;
        const comp: Record<string, number> = {
          totalDeduction: toNumber(itrReturnData.pension_contribution) + toNumber(itrReturnData.shif_contribution) + toNumber(itrReturnData.hl_contribution) + toNumber(itrReturnData.pmf_contribution),
          definedPensionContribution: toNumber(itrReturnData.pension_contribution),
          socialHealthInsuranceContribution: toNumber(itrReturnData.shif_contribution),
          housingLevyContribution: toNumber(itrReturnData.hl_contribution),
          postRetirementMedicalContribution: toNumber(itrReturnData.pmf_contribution),
          mortgageInterest: 0,
          depositInHomeOwnershipSavingPlan: 0,
          employmentIncome: toNumber(itrReturnData.taxable_amount ?? meta.employment_income),
          allowableTaxExemptionDisability: 0,
          netTaxableIncome: toNumber(meta.net_taxable_income),
          taxOnTaxableIncome: toNumber(meta.total_tax_payable),
          totalOfTaxPayableLessReliefsAndExemptions: toNumber(meta.total_tax_payable) - toNumber(meta.personal_relief),
          personalRelief: toNumber(meta.personal_relief),
          insuranceRelief: 0,
          taxCredits: toNumber(meta.total_payed_deducted),
          payeDeductedFromSalary: toNumber(meta.total_payed_deducted),
          incomeTaxPaidInAdvance: 0,
          creditsTotalReliefDtaa: toNumber(meta.credits),
          taxRefundDue: toNumber(meta.amount_payable_or_refundable ?? itrReturnData.tax_due),
        };
        setComputation(comp);
        taxpayerStore.setItrField('taxComputation', comp as any);
        return;
      }

      // Strategy 3: Compute from draft data + employment income summary
      const comp = computeFromDraftData(createResult.data);
      setComputation(comp);
      taxpayerStore.setItrField('taxComputation', comp as any);
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [buildCreatePayload]);

  useEffect(() => {
    if (!taxpayerInfo.pin || !itrData.filingPeriod) {
      setError('Missing required data. Please go back and complete previous steps.');
      setLoading(false);
      return;
    }
    createAndFetchSummary();
  }, []);

  /** When an editable deduction is saved, update the store and re-create + re-fetch */
  const handleEditSave = async (fieldKey: string, storeKey: string) => {
    if (!computation) return;
    const newValue = Number(editValue);

    // Update the store with the new deduction value
    taxpayerStore.setItrField(storeKey as any, newValue);

    setEditingField(null);
    setEditValue('');

    // Re-create the return and re-fetch summary with updated deductions
    await createAndFetchSummary();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const currentItr = taxpayerStore.getItrData();
      if (!currentItr.taxReturnId) {
        taxpayerStore.setItrField('error', 'Missing tax return ID');
        router.push(`/nil-mri-tot/itr/result${phoneParam}`);
        return;
      }

      let returnYear = new Date().getFullYear() - 1;
      if (currentItr.filingPeriod) {
        const yearMatch = currentItr.filingPeriod.match(/(\d{4})/g);
        if (yearMatch && yearMatch.length > 0) {
          returnYear = parseInt(yearMatch[0]);
        }
      }

      const result = await fileItrReturn(
        currentItr.taxReturnId,
        currentItr.obligationId,
        currentItr.filingPeriod,
        computation?.netTaxableIncome || 0,
        computation?.taxRefundDue || 0,
        taxpayerInfo.pin,
        currentItr.taxPayerId || 0,
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
          employmentIncome: currentItr.employmentIncomeRows || [],
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

  const ComputationRow = ({ label, value, editable = false, bold = false, fieldKey, storeKey }: {
    label: string; value: number; editable?: boolean; bold?: boolean; fieldKey?: string; storeKey?: string;
  }) => (
    <div className={`flex items-center justify-between py-2 border-b border-gray-100 last:border-0 ${bold ? 'font-semibold' : ''}`}>
      <div className="flex items-center gap-2 flex-1">
        <span className={`text-xs ${bold ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>{label}</span>
        {editable && fieldKey && storeKey && editingField !== fieldKey && (
          <button type="button" onClick={() => { setEditingField(fieldKey); setEditValue(String(value)); }}
            className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
            <Pencil className="w-2.5 h-2.5" /> Edit
          </button>
        )}
      </div>
      {editable && fieldKey && storeKey && editingField === fieldKey ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-28 px-2 py-1 text-xs border border-[var(--kra-red)] rounded focus:outline-none"
            aria-label={label}
            autoFocus
          />
          <button type="button" onClick={() => handleEditSave(fieldKey, storeKey)} className="text-[10px] text-green-600 font-medium hover:text-green-800">Save</button>
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
      onBack={() => router.push(`/nil-mri-tot/itr/return-information${phoneParam}`)}
      showMenu
    >
      <div className="space-y-4">
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Income Tax Return</h1>
          <p className="text-gray-400 text-xs">Step 3/3 — Tax Computation</p>
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
            <ComputationRow label="Employment Income" value={computation.employmentIncome} bold />
            <ComputationRow label="Total Deduction" value={computation.totalDeduction} bold />
            {editableFields.map(f => (
              <ComputationRow key={f.key} label={f.label} value={computation[f.key]} editable fieldKey={f.key} storeKey={f.storeKey} />
            ))}
            {computation.mortgageInterest > 0 && (
              <ComputationRow label="Mortgage Interest" value={computation.mortgageInterest} />
            )}
            {computation.depositInHomeOwnershipSavingPlan > 0 && (
              <ComputationRow label="Deposit in Home Ownership Saving Plan" value={computation.depositInHomeOwnershipSavingPlan} />
            )}
            <ComputationRow label="Allowable Tax Exemption — Person With Disability" value={computation.allowableTaxExemptionDisability} />
            <ComputationRow label="Net Taxable Income" value={computation.netTaxableIncome} bold />
            <ComputationRow label="Tax On Taxable Income" value={computation.taxOnTaxableIncome} />
            <ComputationRow
              label="Total Of Tax Payable Less Reliefs And Exemptions"
              value={computation.totalOfTaxPayableLessReliefsAndExemptions}
              bold
            />
            <ComputationRow label="Personal Relief" value={computation.personalRelief} />
            <ComputationRow label="Insurance Relief" value={computation.insuranceRelief} />
            <ComputationRow label="Tax Credits" value={computation.taxCredits} bold />
            <ComputationRow label="PAYE Deducted From Salary" value={computation.payeDeductedFromSalary} />
            <ComputationRow label="Income Tax Paid In Advance" value={computation.incomeTaxPaidInAdvance} />
            <ComputationRow label="Credits (Total Relief From DTAA Credits)" value={computation.creditsTotalReliefDtaa} />
            <div className="py-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">Tax / (Refund) Due</span>
              <span className={`text-sm font-bold ${computation.taxRefundDue < 0 ? 'text-green-600' : 'text-[var(--kra-red)]'}`}>
                {computation.taxRefundDue < 0 ? `-${fmt(computation.taxRefundDue)}` : fmt(computation.taxRefundDue)}
              </span>
            </div>
          </Card>
        ) : null}

        {!loading && !error && computation && (
          <DeclarationCheckbox
            label="I certify that the information given in this return is correct and complete. I acknowledge and understand that the filing of this return will be deemed to be an assessment of Tax and that I am liable to pay the assessed amount of tax at the return is submitted."
            checked={certified}
            onChange={(e) => setCertified(e.target.checked)}
          />
        )}

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
