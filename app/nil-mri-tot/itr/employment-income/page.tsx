'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { getItrEmploymentDetails, createItrReturn } from '@/app/actions/nil-mri-tot';
import { Loader2 } from 'lucide-react';

const fmt = (n: number) =>
  `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

interface IncomeRow {
  employerPin: string;
  employerName: string;
  grossPay: number;
  valueOfCarBenefit: number;
  pension: number;
  netValueOfHousing: number;
  allowancesBenefits: number;
  totalEmploymentIncome: number;
  taxableSalary: number;
  amountOfTaxDeductedPaye: number;
  taxPayableOnTaxableSalary: number;
  amountOfTaxPayableRefundable: number;
}

const ROW_LABELS: { key: keyof IncomeRow; label: string }[] = [
  { key: 'employerPin',              label: 'Employer PIN' },
  { key: 'employerName',             label: 'Employer Name' },
  { key: 'grossPay',                 label: 'Gross Pay' },
  { key: 'valueOfCarBenefit',        label: 'Car Benefit' },
  { key: 'pension',                  label: 'Pension' },
  { key: 'netValueOfHousing',        label: 'Net Value of Housing' },
  { key: 'allowancesBenefits',       label: 'Allowances & Benefits' },
  { key: 'totalEmploymentIncome',    label: 'Total Employment Income' },
  { key: 'taxableSalary',            label: 'Taxable Salary' },
  { key: 'amountOfTaxDeductedPaye',  label: 'PAYE Deducted' },
  { key: 'taxPayableOnTaxableSalary',label: 'Tax Payable on Taxable Salary' },
];

const CURRENCY_KEYS = new Set<keyof IncomeRow>([
  'grossPay', 'valueOfCarBenefit', 'pension', 'netValueOfHousing',
  'allowancesBenefits', 'totalEmploymentIncome', 'taxableSalary',
  'amountOfTaxDeductedPaye', 'taxPayableOnTaxableSalary',
]);

function EmploymentIncomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const taxpayerInfo = taxpayerStore.getTaxpayerInfo();
  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const itrData = taxpayerStore.getItrData();
        let returnYear: number | undefined;
        if (itrData.filingPeriod) {
          const yearMatch = itrData.filingPeriod.match(/(\d{4})/g);
          if (yearMatch && yearMatch.length > 0) {
            returnYear = parseInt(yearMatch[0]);
          }
        }
        const result = await getItrEmploymentDetails(taxpayerInfo.pin, returnYear);
        if (result.success && result.rows) {
          setRows(result.rows);
          taxpayerStore.setItrField('employmentIncomeRows', result.rows);
        } else {
          setError(result.message || 'Failed to load employment income');
        }
      } catch (e: any) {
        setError(e.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalIncome = rows.reduce((sum, r) => sum + r.totalEmploymentIncome, 0);

  const handleNext = async () => {
    setCreating(true);
    setError('');
    try {
      const itrData = taxpayerStore.getItrData();

      // Phase 1: Create the ITR draft
      const result = await createItrReturn({
        pin: taxpayerInfo.pin,
        period: itrData.filingPeriod,
        returnType: 'normal',
        pensionContribution: itrData.pensionContribution || 0,
        shifContribution: itrData.shifContribution || 0,
        hlContribution: itrData.hlContribution || 0,
        pmfContribution: itrData.pmfContribution || 0,
        insurancePolicies: itrData.hasInsurancePolicy ? itrData.insurancePolicies : [],
        disabilityCertificates: itrData.disabilityCertificates || [],
        employmentIncome: rows,
      });

      if (result.success) {
        taxpayerStore.setItrField('taxReturnId', result.taxReturnId || null);
        taxpayerStore.setItrField('taxPayerId', result.taxPayerId || null);
        taxpayerStore.setItrField('taxObligationId', result.taxObligationId || null);
        router.push(`/nil-mri-tot/itr/tax-computation${phoneParam}`);
      } else {
        setError(result.message || 'Failed to create ITR return. Please try again.');
      }
    } catch (e: any) {
      setError(e.message || 'Unexpected error creating return');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout
      title="File Tax Return"
      onBack={() => router.push(`/nil-mri-tot/itr/return-information${phoneParam}`)}
      showMenu
    >
      <div className="space-y-4">
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Income Tax Return</h1>
          <p className="text-gray-400 text-xs">Step 2/3 - Employment Income</p>
        </div>

        <p className="text-sm font-semibold text-gray-700">Details Of Employment Income</p>

        {loading ? (
          <Card className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--kra-red)]" />
          </Card>
        ) : error && rows.length === 0 ? (
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-xs text-red-600">{error}</p>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-gray-500">No employment income records found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <Card key={idx} className="divide-y divide-gray-100 p-0">
                {idx === 0 && rows.length > 1 && (
                  <div className="px-4 py-2 bg-gray-50 rounded-t-xl">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Employer {idx + 1}
                    </span>
                  </div>
                )}
                {ROW_LABELS.map(({ key, label }) => {
                  const val = row[key];
                  const display =
                    CURRENCY_KEYS.has(key) && typeof val === 'number'
                      ? fmt(val as number)
                      : String(val);
                  const isBold =
                    key === 'totalEmploymentIncome' || key === 'taxPayableOnTaxableSalary';
                  return (
                    <div key={key} className="flex items-start justify-between px-4 py-2.5">
                      <span className="text-xs text-gray-500 flex-1 pr-2">{label}</span>
                      <span
                        className={`text-xs text-right ${
                          isBold ? 'font-semibold text-gray-900' : 'text-gray-800'
                        }`}
                      >
                        {display}
                      </span>
                    </div>
                  );
                })}
              </Card>
            ))}

            <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-gray-300 font-medium">Total Employment Income</span>
              <span className="text-sm font-bold text-white">{fmt(totalIncome)}</span>
            </div>
          </div>
        )}

        {error && rows.length > 0 && (
          <Card className="p-3 bg-red-50 border-red-200">
            <p className="text-xs text-red-600">{error}</p>
          </Card>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={() => { taxpayerStore.clear(); router.push('/nil-mri-tot'); }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading || rows.length === 0 || creating}
            className="flex-1"
          >
            {creating ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Creating Return...</> : 'Next'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function EmploymentIncomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      }
    >
      <EmploymentIncomeContent />
    </Suspense>
  );
}
