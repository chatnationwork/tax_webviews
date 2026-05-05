'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button, Input, Select } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { validateInsurancePin, createItrReturn, getItrReturn } from '@/app/actions/nil-mri-tot';
import { Loader2, Plus, Trash2, Shield, CircleDot, Landmark, Wallet } from 'lucide-react';
import type { ItrConfigLimits, MortgageEntry, DisabilityCertDetail } from '../../_lib/definitions';

function getConfigForPeriod(itrConfig: any, filingPeriod: string): ItrConfigLimits | null {
  if (!itrConfig) return null;
  const yearMatch = filingPeriod.match(/(\d{4})/g);
  if (yearMatch) {
    for (const y of yearMatch) {
      const key = `year_${y}`;
      if (itrConfig[key]) return itrConfig[key];
    }
  }
  return itrConfig.default ?? null;
}

function ReturnInformationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';

  const taxpayerInfo = taxpayerStore.getTaxpayerInfo();
  const itrData = taxpayerStore.getItrData();
  const limits = getConfigForPeriod(itrData.itrConfig, itrData.filingPeriod);

  // --- Deductions — pre-fill from store first, fall back to employment income summary ---
  const summary = itrData.employmentIncomeSummary;
  const [pension, setPension] = useState(String(itrData.pensionContribution || summary?.pension || ''));
  const [shif, setShif] = useState(String(itrData.shifContribution || summary?.shiFund || ''));
  const [hl, setHl] = useState(String(itrData.hlContribution || summary?.ahLevy || ''));
  const [pmf, setPmf] = useState(String(itrData.pmfContribution || summary?.prmFund || ''));

  const deductionError = (value: string, max: number | undefined) => {
    const n = Number(value);
    if (value && max && n > max) return `Maximum allowed is KES ${max.toLocaleString()}`;
    return '';
  };

  // --- Insurance ---
  const [hasInsurance, setHasInsurance] = useState(itrData.hasInsurancePolicy);
  const [policies, setPolicies] = useState<any[]>(itrData.insurancePolicies || []);
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    typeOfPolicy: '', policyHolder: '', insuranceCompanyPin: '',
    insurancePolicyNumber: '', ageOfChild: '', commencementDate: '',
    maturityDate: '', sumAssured: '', annualPremiumPaid: '', amountOfInsuranceRelief: '',
  });
  const [selectedInsurerPin, setSelectedInsurerPin] = useState('');
  const [validatedInsurer, setValidatedInsurer] = useState<{ pin: string; companyName: string } | null>(null);
  const [insurancePinError, setInsurancePinError] = useState('');
  const [validatingInsurancePin, setValidatingInsurancePin] = useState(false);

  // --- Disability (pre-populated from employment income response) ---
  const isPwd = itrData.isPwd;
  const certDetails: DisabilityCertDetail[] = itrData.itExemptionCertDetails || [];

  // --- Mortgage ---
  const [hasMortgage, setHasMortgage] = useState((itrData.mortgages?.length ?? 0) > 0);
  const [mortgages, setMortgages] = useState<MortgageEntry[]>(itrData.mortgages || []);
  const [mortgageForm, setMortgageForm] = useState({
    pinOfLender: '', nameOfLender: '', mortgageAccountNo: '',
    amountBorrowed: '', outstandingAmount: '', interestAmountPaid: '',
  });
  const [showMortgageModal, setShowMortgageModal] = useState(false);

  useEffect(() => {
    if (!taxpayerInfo.pin) {
      router.push('/nil-mri-tot/itr/validation');
    }
  }, [taxpayerInfo.pin, router]);

  // --- Insurance handlers ---
  const handleValidateInsurancePin = async () => {
    setInsurancePinError('');
    setValidatedInsurer(null);
    if (selectedInsurerPin.length !== 11) {
      setInsurancePinError('PIN must be exactly 11 characters');
      return;
    }
    setValidatingInsurancePin(true);
    try {
      const result = await validateInsurancePin(selectedInsurerPin);
      if (result.success && result.companyName && result.pin) {
        setValidatedInsurer({ pin: result.pin, companyName: result.companyName });
      } else {
        setInsurancePinError(result.error || 'Invalid insurance company PIN');
      }
    } catch (error: any) {
      setInsurancePinError(error?.message || 'Failed to validate insurance PIN');
    } finally {
      setValidatingInsurancePin(false);
    }
  };

  const handleOpenInsuranceModal = () => {
    if (!validatedInsurer) return;
    setModalForm((prev) => ({ ...prev, insuranceCompanyPin: validatedInsurer.pin }));
    setShowModal(true);
  };

  const handleAddPolicy = () => {
    if (!validatedInsurer || !modalForm.typeOfPolicy || !modalForm.insurancePolicyNumber || !modalForm.policyHolder || !modalForm.commencementDate || !modalForm.maturityDate || !modalForm.sumAssured || !modalForm.annualPremiumPaid || !modalForm.amountOfInsuranceRelief) return;
    const entry = {
      ...modalForm,
      insuranceCompanyPin: validatedInsurer.pin,
      insuranceCompanyName: validatedInsurer.companyName,
      sumAssured: Number(modalForm.sumAssured),
      annualPremiumPaid: Number(modalForm.annualPremiumPaid),
      amountOfInsuranceRelief: Number(modalForm.amountOfInsuranceRelief),
    };
    const updated = [...policies, entry];
    setPolicies(updated);
    taxpayerStore.setItrField('insurancePolicies', updated);
    setShowModal(false);
    setModalForm({ typeOfPolicy: '', policyHolder: '', insuranceCompanyPin: '', insurancePolicyNumber: '', ageOfChild: '', commencementDate: '', maturityDate: '', sumAssured: '', annualPremiumPaid: '', amountOfInsuranceRelief: '' });
    setSelectedInsurerPin('');
    setValidatedInsurer(null);
    setInsurancePinError('');
  };

  const handleRemovePolicy = (index: number) => {
    const updated = policies.filter((_, i) => i !== index);
    setPolicies(updated);
    taxpayerStore.setItrField('insurancePolicies', updated);
  };

  // --- Mortgage handlers ---
  const handleAddMortgage = () => {
    const { pinOfLender, nameOfLender, mortgageAccountNo, amountBorrowed, outstandingAmount, interestAmountPaid } = mortgageForm;
    if (!pinOfLender || !mortgageAccountNo || !amountBorrowed || !interestAmountPaid) return;

    const maxInterest = limits?.mortgage?.interestCap?.max;
    const interest = Number(interestAmountPaid);
    const cappedInterest = maxInterest ? Math.min(interest, maxInterest) : interest;

    const entry: MortgageEntry = {
      pinOfLender, nameOfLender, mortgageAccountNo,
      amountBorrowed: Number(amountBorrowed),
      outstandingAmount: Number(outstandingAmount || 0),
      interestAmountPaid: cappedInterest,
    };
    const updated = [...mortgages, entry];
    setMortgages(updated);
    taxpayerStore.setItrField('mortgages', updated);
    setShowMortgageModal(false);
    setMortgageForm({ pinOfLender: '', nameOfLender: '', mortgageAccountNo: '', amountBorrowed: '', outstandingAmount: '', interestAmountPaid: '' });
  };

  const handleRemoveMortgage = (index: number) => {
    const updated = mortgages.filter((_, i) => i !== index);
    setMortgages(updated);
    taxpayerStore.setItrField('mortgages', updated);
  };

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // --- Navigation ---
  const handleNext = async () => {
    // Save all deduction values to store
    taxpayerStore.setItrField('pensionContribution', Number(pension) || 0);
    taxpayerStore.setItrField('shifContribution', Number(shif) || 0);
    taxpayerStore.setItrField('hlContribution', Number(hl) || 0);
    taxpayerStore.setItrField('pmfContribution', Number(pmf) || 0);
    taxpayerStore.setItrField('hasInsurancePolicy', hasInsurance);

    if (isPwd && certDetails.length > 0) {
      taxpayerStore.setItrField('disabilityCertificates', certDetails);
    } else {
      taxpayerStore.setItrField('disabilityCertificates', []);
    }

    // Create the ITR draft and trigger backend computation before navigating
    setCreating(true);
    setCreateError('');
    try {
      const data = taxpayerStore.getItrData();
      const result = await createItrReturn({
        pin: taxpayerInfo.pin,
        period: data.filingPeriod,
        returnType: 'normal',
        pensionContribution: Number(pension) || 0,
        shifContribution: Number(shif) || 0,
        hlContribution: Number(hl) || 0,
        pmfContribution: Number(pmf) || 0,
        insurancePolicies: hasInsurance ? data.insurancePolicies : [],
        disabilityCertificates: [],
        employmentIncome: data.employmentIncomeRows,
        mortgages: data.mortgages || [],
      });

      if (!result.success) {
        setCreateError(result.message || '');
        return;
      }

      taxpayerStore.setItrField('taxReturnId', result.taxReturnId || null);
      taxpayerStore.setItrField('taxPayerId', result.taxPayerId || null);
      taxpayerStore.setItrField('taxObligationId', result.taxObligationId || null);

      if (result.arrays) {
        taxpayerStore.setItrField('itrReturnMortgages', result.arrays.mortgages);
        taxpayerStore.setItrField('itrReturnInsurancePolicies', result.arrays.insurancePolicies);
        taxpayerStore.setItrField('itrReturnCarBenefits', result.arrays.carBenefits);
        taxpayerStore.setItrField('itrReturnDisabilityCerts', result.arrays.disabilityCertificates);
        taxpayerStore.setItrField('taxReturnRef', result.arrays.taxReturnRef);
        taxpayerStore.setItrField('itrStatus', result.arrays.status);
      }

      // Trigger backend tax computation (personal relief, PAYE reconciliation etc.)
      if (result.taxPayerId && result.taxObligationId && data.filingPeriod) {
        try {
          await getItrReturn(result.taxPayerId, result.taxObligationId, data.filingPeriod);
        } catch {
          // Non-fatal: tax-computation page will retry or fallback
        }
      }

      router.push(`/nil-mri-tot/itr/tax-computation${phoneParam}`);
    } catch (e: any) {
      setCreateError(e.message || '');
    } finally {
      setCreating(false);
    }
  };

  const hasDeductionErrors =
    !!deductionError(pension, limits?.pension?.max) ||
    !!deductionError(shif, limits?.hlevy?.max) ||
    !!deductionError(hl, limits?.hlevy?.max) ||
    !!deductionError(pmf, limits?.prmc?.max);

  return (
    <Layout title="File Tax Return" onBack={() => router.push(`/nil-mri-tot/itr/employment-income${phoneParam}`)} showMenu>
      <div className="space-y-4">
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Income Tax Return</h1>
          <p className="text-gray-400 text-xs">Step 2/3 — Return Information</p>
        </div>

        {/* Insurance */}
        <Card className="space-y-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--kra-red)]" />
              Insurance Policy
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-xs text-gray-600 font-medium">Do you have an insurance policy?</p>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="insurance" checked={!hasInsurance} onChange={() => setHasInsurance(false)} className="w-3 h-3 text-[var(--kra-red)]" />
              <span className="text-xs text-gray-700">No</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="insurance" checked={hasInsurance} onChange={() => setHasInsurance(true)} className="w-3 h-3 text-[var(--kra-red)]" />
              <span className="text-xs text-gray-700">Yes</span>
            </label>
          </div>

          {hasInsurance && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Computation of Insurance Relief</p>
              <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <Input
                  label="Insurance Company PIN"
                  placeholder="Enter insurer PIN (e.g. P051300696C)"
                  value={selectedInsurerPin}
                  onChange={(v) => { setSelectedInsurerPin(v.toUpperCase()); setValidatedInsurer(null); setInsurancePinError(''); }}
                  required
                />
                <Button type="button" onClick={handleValidateInsurancePin} disabled={selectedInsurerPin.length !== 11 || validatingInsurancePin} className="w-full">
                  {validatingInsurancePin ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Validating PIN...</> : 'Validate PIN'}
                </Button>
                {validatedInsurer && <div className="p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-xs text-green-700 font-medium">✓ {validatedInsurer.companyName} ({validatedInsurer.pin})</p></div>}
                {insurancePinError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-xs text-red-600">{insurancePinError}</p></div>}
              </div>

              {policies.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center space-y-2">
                  <p className="text-sm font-medium text-gray-700">Add Insurance Relief Details</p>
                  <button onClick={handleOpenInsuranceModal} disabled={!validatedInsurer} className="px-4 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700 disabled:opacity-40">
                    Continue to Details
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {policies.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-gray-800">{p.typeOfPolicy}</p>
                        <p className="text-xs text-gray-500">{p.insurancePolicyNumber}</p>
                      </div>
                      <button type="button" onClick={() => handleRemovePolicy(i)} className="text-red-500 hover:text-red-700" aria-label="Remove policy"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={handleOpenInsuranceModal} disabled={!validatedInsurer} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <Plus className="w-3 h-3" /> Add another policy
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Disability */}
        <Card className="space-y-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-blue-500" />
              Disability Exemption
            </p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${isPwd ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {isPwd ? 'Eligible' : 'Not applicable'}
            </span>
          </div>

          {isPwd && certDetails.length > 0 ? (
            <div className="space-y-2">
              {certDetails.map((cert, i) => (
                <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-800">Certificate Issued</p>
                  <p className="text-xs text-green-700 mt-1">Certificate No: {cert.certNo}</p>
                  {cert.effectiveDate && <p className="text-xs text-green-700">Effective: {cert.effectiveDate}</p>}
                  {cert.expiryDate && <p className="text-xs text-green-700">Expires: {cert.expiryDate}</p>}
                </div>
              ))}
            </div>
          ) : isPwd ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">You are flagged as a person with disability but no exemption certificate details were found.</p>
            </div>
          ) : (
            <div className="border border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2">
              <p className="text-xs text-gray-500">No disability exemption applicable</p>
            </div>
          )}
        </Card>

        {/* Mortgage */}
        <Card className="space-y-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-600" />
              Mortgage Interest
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-xs text-gray-600 font-medium">Do you have a mortgage?</p>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="mortgage" checked={!hasMortgage} onChange={() => setHasMortgage(false)} className="w-3 h-3" />
              <span className="text-xs text-gray-700">No</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="mortgage" checked={hasMortgage} onChange={() => setHasMortgage(true)} className="w-3 h-3" />
              <span className="text-xs text-gray-700">Yes</span>
            </label>
          </div>

          {hasMortgage && (
            <div className="space-y-2">
              {mortgages.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center space-y-2">
                  <p className="text-sm font-medium text-gray-700">Add Mortgage Details</p>
                  <button onClick={() => setShowMortgageModal(true)} className="px-4 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700">
                    Add Mortgage
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {mortgages.map((m, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-gray-800">{m.nameOfLender || m.pinOfLender}</p>
                        <p className="text-xs text-gray-500">A/C {m.mortgageAccountNo} — Interest: KES {m.interestAmountPaid.toLocaleString()}</p>
                      </div>
                      <button type="button" onClick={() => handleRemoveMortgage(i)} className="text-red-500 hover:text-red-700" aria-label="Remove mortgage"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setShowMortgageModal(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <Plus className="w-3 h-3" /> Add another mortgage
                  </button>
                </div>
              )}
              {limits?.mortgage?.interestCap?.max && (
                <p className="text-[10px] text-gray-400">Interest is capped at KES {limits.mortgage.interestCap.max.toLocaleString()} per year</p>
              )}
            </div>
          )}
        </Card>

        {createError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{createError}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={() => { taxpayerStore.clear(); router.push('/nil-mri-tot'); }} className="flex-1">Cancel</Button>
          <Button onClick={handleNext} disabled={hasDeductionErrors || creating} className="flex-1">
            {creating ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Calculating Tax...</> : 'Next'}
          </Button>
        </div>
      </div>

      {/* Insurance Policy Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">Computation Of Insurance Relief</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600 font-medium">PIN Of Insurance Company</p>
                {validatedInsurer && (
                  <button type="button" onClick={() => { setSelectedInsurerPin(''); setValidatedInsurer(null); setInsurancePinError(''); setShowModal(false); }} className="text-xs text-[var(--kra-red)] hover:underline">Clear</button>
                )}
              </div>
              <Input label="" placeholder="Insurer PIN" value={validatedInsurer?.pin || selectedInsurerPin} onChange={setSelectedInsurerPin} disabled required />
              {validatedInsurer?.companyName && <p className="text-xs text-green-700">✓ {validatedInsurer.companyName}</p>}
            </div>
            <Select label="Type Of Policy" value={modalForm.typeOfPolicy} onChange={(v) => setModalForm({ ...modalForm, typeOfPolicy: v })} required options={[{ value: 'Life', label: 'Life Insurance' }, { value: 'Education', label: 'Education Policy' }, { value: 'Health', label: 'Health Insurance' }]} />
            <Input label="Insurance Policy Number" value={modalForm.insurancePolicyNumber} onChange={(v) => setModalForm({ ...modalForm, insurancePolicyNumber: v })} required placeholder="Enter policy number" />
            <Select label="Policy Holder" value={modalForm.policyHolder} onChange={(v) => setModalForm({ ...modalForm, policyHolder: v })} required options={[{ value: 'Self', label: 'Self' }, { value: 'Spouse', label: 'Spouse' }, { value: 'Child', label: 'Child' }]} />
            <Input label="Age Of Child" value={modalForm.ageOfChild || ''} onChange={(v) => setModalForm({ ...modalForm, ageOfChild: v })} placeholder="Enter age (if applicable)" />
            <Input label="Commencement Date" type="date" value={modalForm.commencementDate} onChange={(v) => setModalForm({ ...modalForm, commencementDate: v })} required />
            <Input label="Maturity Date" type="date" value={modalForm.maturityDate} onChange={(v) => setModalForm({ ...modalForm, maturityDate: v })} required />
            <Input label="Sum Assured" value={modalForm.sumAssured} onChange={(v) => setModalForm({ ...modalForm, sumAssured: v })} required type="number" placeholder="0.00" />
            <Input label="Annual Premium Paid" value={modalForm.annualPremiumPaid} onChange={(v) => {
              const premium = Number(v) || 0;
              const relief = Math.round(premium * 0.15 * 100) / 100;
              const maxRelief = limits?.insurance_relief?.max;
              const cappedRelief = maxRelief ? Math.min(relief, maxRelief) : relief;
              setModalForm({ ...modalForm, annualPremiumPaid: v, amountOfInsuranceRelief: String(cappedRelief) });
            }} required type="number" placeholder="0.00" />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount Of Insurance Relief</label>
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">{modalForm.amountOfInsuranceRelief || '0.00'}</div>
              <p className="text-[10px] text-gray-400 mt-0.5">Auto-calculated: 15% of Annual Premium Paid{limits?.insurance_relief?.max ? `, capped at KES ${limits.insurance_relief.max.toLocaleString()}` : ''}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddPolicy} className="flex-1" disabled={!validatedInsurer || !modalForm.typeOfPolicy || !modalForm.insurancePolicyNumber || !modalForm.policyHolder || !modalForm.commencementDate || !modalForm.maturityDate || !modalForm.sumAssured || !modalForm.annualPremiumPaid || !modalForm.amountOfInsuranceRelief}>Add</Button>
            </div>
          </div>
        </div>
      )}

      {/* Mortgage Modal */}
      {showMortgageModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">Mortgage Details</h2>
            <Input label="Lender PIN" value={mortgageForm.pinOfLender} onChange={(v) => setMortgageForm({ ...mortgageForm, pinOfLender: v.toUpperCase() })} required placeholder="e.g. A012040964H" />
            <Input label="Name of Lender" value={mortgageForm.nameOfLender} onChange={(v) => setMortgageForm({ ...mortgageForm, nameOfLender: v })} placeholder="Bank / lender name" />
            <Input label="Mortgage Account No" value={mortgageForm.mortgageAccountNo} onChange={(v) => setMortgageForm({ ...mortgageForm, mortgageAccountNo: v })} required placeholder="Account number" />
            <Input label="Amount Borrowed" value={mortgageForm.amountBorrowed} onChange={(v) => setMortgageForm({ ...mortgageForm, amountBorrowed: v })} required type="number" placeholder="0" />
            <Input label="Outstanding Amount" value={mortgageForm.outstandingAmount} onChange={(v) => setMortgageForm({ ...mortgageForm, outstandingAmount: v })} type="number" placeholder="0" />
            <Input label="Interest Amount Paid" value={mortgageForm.interestAmountPaid} onChange={(v) => setMortgageForm({ ...mortgageForm, interestAmountPaid: v })} required type="number" placeholder="0"
              helperText={limits?.mortgage?.interestCap?.max ? `Capped at KES ${limits.mortgage.interestCap.max.toLocaleString()}` : undefined}
            />
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowMortgageModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddMortgage} className="flex-1" disabled={!mortgageForm.pinOfLender || !mortgageForm.mortgageAccountNo || !mortgageForm.amountBorrowed || !mortgageForm.interestAmountPaid}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default function ReturnInformationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <ReturnInformationContent />
    </Suspense>
  );
}
