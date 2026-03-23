'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { getEmploymentIncome } from '@/app/actions/nil-mri-tot';
import { Loader2 } from 'lucide-react';

const fmt = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

function EmploymentIncomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const taxpayerInfo = taxpayerStore.getTaxpayerInfo();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const result = await getEmploymentIncome(taxpayerInfo.pin);
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
    fetch();
  }, []);

  const totalIncome = rows.reduce((sum, r) => sum + r.totalEmploymentIncome, 0);

  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';

  return (
    <Layout
      title="File Tax Return"
      onBack={() => router.push(`/nil-mri-tot/itr/return-information${phoneParam}`)}
      showMenu
    >
      <div className="space-y-4">

        {/* 3-step stepper */}
        <div className="flex items-center justify-between px-2 py-3">
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-[var(--kra-red)] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-[10px] text-[var(--kra-red)] font-medium text-center">Return Information</span>
          </div>
          <div className="flex-1 h-px bg-[var(--kra-red)] mx-2 mb-4" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-[var(--kra-red)] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
            <span className="text-[10px] text-[var(--kra-red)] font-medium text-center">Employment Income</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-2 mb-4" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
            <span className="text-[10px] text-gray-400 text-center">Tax Computation</span>
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-700">Details Of Employment Income</p>

        {loading ? (
          <Card className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--kra-red)]" />
          </Card>
        ) : error ? (
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-xs text-red-600">{error}</p>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-gray-500">No employment income records found</p>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Employer PIN','Employer Name','Gross Pay','Car Benefit','Pension','Housing','Total Income','Taxable Salary','PAYE Deducted','Tax Payable'].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-gray-600 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-2 py-2 text-gray-800 whitespace-nowrap">{r.employerPin}</td>
                      <td className="px-2 py-2 text-gray-800 whitespace-nowrap">{r.employerName}</td>
                      <td className="px-2 py-2 text-gray-800 whitespace-nowrap">{fmt(r.grossPay)}</td>
                      <td className="px-2 py-2 text-gray-800 whitespace-nowrap">{fmt(r.valueOfCarBenefit)}</td>
                      <td className="px-2 py-2 text-gray-800 whitespace-nowrap">{fmt(r.pension)}</td>
                      <td className="px-2 py-2 text-gray-800 whitespace-nowrap">{fmt(r.netValueOfHousing)}</td>
                      <td className="px-2 py-2 text-gray-800 whitespace-nowrap">{fmt(r.totalEmploymentIncome)}</td>
                      <td className="px-2 py-2 text-gray-800 whitespace-nowrap">{fmt(r.taxableSalary)}</td>
                      <td className="px-2 py-2 text-gray-800 whitespace-nowrap">{fmt(r.amountOfTaxDeductedPaye)}</td>
                      <td className="px-2 py-2 text-gray-800 whitespace-nowrap">{fmt(r.taxPayableOnTaxableSalary)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={6} className="px-2 py-2 text-xs font-semibold text-gray-800">Total Employment Income</td>
                    <td className="px-2 py-2 text-xs font-semibold text-gray-800">{fmt(totalIncome)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </Card>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={() => { taxpayerStore.clear(); router.push('/nil-mri-tot'); }} className="flex-1">Cancel</Button>
          <Button onClick={() => router.push(`/nil-mri-tot/itr/tax-computation${phoneParam}`)} disabled={loading || rows.length === 0} className="flex-1">Next</Button>
        </div>
      </div>
    </Layout>
  );
}

export default function EmploymentIncomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <EmploymentIncomeContent />
    </Suspense>
  );
}
