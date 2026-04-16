'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { taxpayerStore } from '../nil-mri-tot/_lib/store';

const FIELD_BASE =
  'w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm';

const defaults = {
  phone:        '254712345678',
  name:         'Jane Mwangi',
  pin:          'A123456789B',
  receipt:      'ITR-2024-XYZ001',
  filingPeriod: '01.01.2024 - 31.12.2024',
  taxDue:       '12500',
};

export default function TestHypecardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const phone        = (fd.get('phone') as string)?.trim();
    const name         = (fd.get('name') as string)?.trim() || 'Taxpayer';
    const pin          = (fd.get('pin') as string)?.trim() || 'A000000000A';
    const receipt      = (fd.get('receipt') as string)?.trim() || 'N/A';
    const filingPeriod = (fd.get('filingPeriod') as string)?.trim() || '2024';
    const taxDue       = Number((fd.get('taxDue') as string)?.replace(/[^0-9.-]/g, '') || 0);

    // 1. Populate the Zustand store with dummy data
    taxpayerStore.setMsisdn(phone);
    taxpayerStore.setTaxpayerInfo('00000000', 1990, name, pin);
    taxpayerStore.setReceiptNumber(receipt);
    taxpayerStore.setFilingPeriod(filingPeriod);

    // ITR-specific fields the result page reads
    taxpayerStore.setItrField('filingPeriod', filingPeriod);
    taxpayerStore.setItrField('receiptNumber', receipt);
    taxpayerStore.setItrField('taxComputation', {
      totalDeduction: 0,
      definedPensionContribution: 0,
      socialHealthInsuranceContribution: 0,
      housingLevyContribution: 0,
      postRetirementMedicalContribution: 0,
      mortgageInterest: 0,
      depositInHomeOwnershipSavingPlan: 0,
      employmentIncome: 0,
      allowableTaxExemptionDisability: 0,
      netTaxableIncome: 0,
      taxOnTaxableIncome: 0,
      totalOfTaxPayableLessReliefsAndExemptions: 0,
      personalRelief: 0,
      insuranceRelief: 0,
      taxCredits: 0,
      payeDeductedFromSalary: 0,
      incomeTaxPaidInAdvance: 0,
      creditsTotalReliefDtaa: 0,
      taxRefundDue: taxDue,
    });

    // 2. Navigate to the existing ITR result page
    //    The result page will read the store and handle WhatsApp text + image sending
    router.push(`/nil-mri-tot/itr/result?phone=${encodeURIComponent(phone)}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 mb-4 shadow-lg shadow-blue-500/10">
            <span className="text-3xl">🧪</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Hypecard Test Console</h1>
          <p className="text-sm text-blue-300/80 mt-1">
            Populate dummy data → navigate to ITR result page → WhatsApp text + Hypecard image sent
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/30">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1.5">
                WhatsApp Phone *
              </label>
              <input
                type="tel"
                name="phone"
                required
                defaultValue={defaults.phone}
                placeholder="e.g. 254712345678"
                className={FIELD_BASE}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input type="text" name="name" defaultValue={defaults.name} placeholder="Taxpayer Name" className={FIELD_BASE} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1.5">
                  KRA PIN
                </label>
                <input type="text" name="pin" defaultValue={defaults.pin} placeholder="A000000000A" className={FIELD_BASE} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1.5">
                Receipt Number
              </label>
              <input type="text" name="receipt" defaultValue={defaults.receipt} placeholder="ITR-2024-XXXXXX" className={FIELD_BASE} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1.5">
                  Filing Period
                </label>
                <input type="text" name="filingPeriod" defaultValue={defaults.filingPeriod} placeholder="2024" className={FIELD_BASE} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1.5">
                  Tax Due (KES)
                </label>
                <input type="text" name="taxDue" defaultValue={defaults.taxDue} placeholder="0.00" className={FIELD_BASE} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Redirecting…
                </span>
              ) : (
                '🚀 Populate Store & Go to Result Page'
              )}
            </button>
          </form>
        </div>

        {/* Info box */}
        <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-500/5 p-4 backdrop-blur-xl text-xs text-blue-300/70 space-y-1">
          <p><strong className="text-blue-300">How it works:</strong></p>
          <ol className="list-decimal list-inside space-y-0.5 pl-1">
            <li>Fills the Zustand <code>taxpayerStore</code> with the form values.</li>
            <li>Navigates to <code>/nil-mri-tot/itr/result</code>.</li>
            <li>Result page sends WhatsApp text + generates Hypecard + sends the image via WhatsApp.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
