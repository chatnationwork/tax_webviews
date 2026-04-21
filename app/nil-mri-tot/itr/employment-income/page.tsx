'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { getItrEmploymentDetails, getStoredPhone, sendWhatsAppMessage, renderNoEmployerCard, sendWhatsAppImage } from '@/app/actions/nil-mri-tot';
import { getKnownPhone } from '@/app/_lib/session-store';
import { Loader2, AlertTriangle } from 'lucide-react';

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

function getEmptyStateTitle(message: string): string {
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes('paye credit')) return 'No PAYE Credits Found';
  if (normalizedMessage.includes('previous period') && normalizedMessage.includes('not filed')) {
    return 'Previous Return Not Filed';
  }
  return 'No Employer Declared';
}

function EmploymentIncomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [noEmployerMessage, setNoEmployerMessage] = useState('');
  const hasLoadedEmploymentRef = useRef(false);

  const taxpayerInfo = taxpayerStore.getTaxpayerInfo();
  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';

  useEffect(() => {
    if (!taxpayerInfo.pin) {
      router.push('/nil-mri-tot/itr/validation');
      return;
    }
    if (hasLoadedEmploymentRef.current) return;
    hasLoadedEmploymentRef.current = true;

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
          if (result.rows.length === 0 && result.message) {
            setNoEmployerMessage(result.message);
          }
          setRows(result.rows);
          taxpayerStore.setItrField('employmentIncomeRows', result.rows);

          // Store the server-computed summary for fallback in tax-computation
          if (result.summary) {
            taxpayerStore.setItrField('employmentIncomeSummary', result.summary);
          }

          // Store disability/PWD info from the employment response
          const isPwd = result.summary?.isPwd ?? false;
          taxpayerStore.setItrField('isPwd', isPwd);

          if (result.itExemptionCertDetails && result.itExemptionCertDetails.length > 0) {
            taxpayerStore.setItrField('itExemptionCertDetails', result.itExemptionCertDetails);
            taxpayerStore.setItrField('hasDisabilityExemption', true);
          } else {
            taxpayerStore.setItrField('itExemptionCertDetails', []);
            taxpayerStore.setItrField('hasDisabilityExemption', isPwd);
          }
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

  const handleNext = () => {
    router.push(`/nil-mri-tot/itr/return-information${phoneParam}`);
  };

  const handleFinishNoIncome = async () => {
    setFinishing(true);
    try {
      const recipientPhone = taxpayerStore.getMsisdn() || await getStoredPhone() || getKnownPhone();
      if (recipientPhone && taxpayerInfo.pin) {
        const message = `Dear ${taxpayerInfo.fullName || 'Taxpayer'},\n\nYour PIN: ${taxpayerInfo.pin} does not have a declared employer under sources of income. You are unable to file an Income Tax Return at this time.\n\nPlease visit the nearest KRA office or use iTax to declare your employer before filing.\n\nNo action is required at this time.`;
        
        const filingCard = await renderNoEmployerCard({
          name: taxpayerInfo.fullName || 'Taxpayer',
          pin: taxpayerInfo.pin,
        });

        if (filingCard && 'url' in filingCard && filingCard.url) {
          await sendWhatsAppImage({
            recipientPhone,
            imageUrl: filingCard.url,
            caption: message
          });
        } else {
          await sendWhatsAppMessage({ recipientPhone, message });
        }
      }
    } catch (e) {
      console.error('Failed to send WhatsApp notification', e);
    } finally {
      setFinishing(false);
      router.push('/');
    }
  };

  return (
    <Layout
      title="File Tax Return"
      onBack={() => router.push(`/nil-mri-tot/itr/verify${phoneParam}`)}
      showMenu
    >
      <div className="space-y-4">
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Income Tax Return</h1>
          <p className="text-gray-400 text-xs">Step 1/3 — Employment Income</p>
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
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {getEmptyStateTitle(noEmployerMessage)}
                </p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {noEmployerMessage || 'You have not declared an employer under sources of income. To file an Income Tax Return, you must first declare your employer on iTax or visit the nearest KRA office.'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <span className="text-amber-600 text-lg mt-0.5">⚠</span>
              <p className="text-sm text-amber-900 leading-relaxed">
                <span className="font-semibold block mb-1">Please Note:</span>
                This return type applies to taxpayers with <span className="font-semibold">employment income only</span>.
              </p>
            </div>

            <Button
              onClick={handleFinishNoIncome}
              disabled={finishing}
              className="w-full"
            >
              {finishing ? 'Finishing...' : 'Finish'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <Card key={idx} className="divide-y divide-gray-100 p-0">
                {rows.length > 1 && (
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

        {!loading && rows.length > 0 ? (
          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                taxpayerStore.clear();
                router.push('/nil-mri-tot');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleNext} className="flex-1">
              Next
            </Button>
          </div>
        ) : null}
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
