'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button, Input, Select } from '../../../_components/Layout';
import { taxpayerStore } from '../../_lib/store';
import { getDisabilityExemption, validateInsurancePin } from '@/app/actions/nil-mri-tot';
import { Loader2, Plus, Trash2 } from 'lucide-react';

function ReturnInformationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const [activeTab, setActiveTab] = useState<'insurance' | 'disability'>('insurance');
  const [hasInsurance, setHasInsurance] = useState(false);
  const [policies, setPolicies] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    typeOfPolicy: '',
    policyHolder: '',
    insuranceCompanyPin: '',
    insurancePolicyNumber: '',
    ageOfChild: '',
    commencementDate: '',
    maturityDate: '',
    sumAssured: '',
    annualPremiumPaid: '',
    amountOfInsuranceRelief: '',
  });
  const [selectedInsurerPin, setSelectedInsurerPin] = useState('');
  const [validatedInsurer, setValidatedInsurer] = useState<{ pin: string; companyName: string } | null>(null);
  const [insurancePinError, setInsurancePinError] = useState('');
  const [validatingInsurancePin, setValidatingInsurancePin] = useState(false);

  // Disability state
  const [loadingDisability, setLoadingDisability] = useState(false);
  const [disabilityResult, setDisabilityResult] = useState<{ hasCertificate: boolean; certificateNumber?: string } | null>(null);

  const taxpayerInfo = taxpayerStore.getTaxpayerInfo();

  // Fetch disability exemption when disability tab is opened
  useEffect(() => {
    if (activeTab === 'disability' && disabilityResult === null) {
      const fetchDisability = async () => {
        setLoadingDisability(true);
        try {
          const result = await getDisabilityExemption(taxpayerInfo.pin);
          setDisabilityResult({ hasCertificate: result.hasCertificate, certificateNumber: result.certificateNumber });
          taxpayerStore.setItrField('hasDisabilityExemption', result.hasCertificate);
          if (result.certificateNumber) {
            taxpayerStore.setItrField('disabilityCertificateNumber', result.certificateNumber);
          }
        } catch (e) {
          setDisabilityResult({ hasCertificate: false });
        } finally {
          setLoadingDisability(false);
        }
      };
      fetchDisability();
    }
  }, [activeTab]);

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
    setModalForm({
      typeOfPolicy: '', policyHolder: '', insuranceCompanyPin: '',
      insurancePolicyNumber: '', ageOfChild: '', commencementDate: '',
      maturityDate: '', sumAssured: '', annualPremiumPaid: '', amountOfInsuranceRelief: '',
    });
    setSelectedInsurerPin('');
    setValidatedInsurer(null);
    setInsurancePinError('');
  };
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
    setModalForm((prev) => ({
      ...prev,
      insuranceCompanyPin: validatedInsurer.pin,
    }));
    setShowModal(true);
  };


  const handleRemovePolicy = (index: number) => {
    const updated = policies.filter((_, i) => i !== index);
    setPolicies(updated);
    taxpayerStore.setItrField('insurancePolicies', updated);
  };

  const handleNext = () => {
    taxpayerStore.setItrField('hasInsurancePolicy', hasInsurance);
    if (disabilityResult?.hasCertificate && disabilityResult.certificateNumber) {
      taxpayerStore.setItrField('disabilityCertificates', [{
        certificateNumber: disabilityResult.certificateNumber,
        effectiveDate: '',
        expiryDate: '',
      }]);
    } else {
      taxpayerStore.setItrField('disabilityCertificates', []);
    }
    router.push(`/nil-mri-tot/itr/employment-income${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`);
  };

  const handleCancel = () => {
    taxpayerStore.clear();
    router.push('/nil-mri-tot');
  };

  return (
    <Layout title="File Tax Return" onBack={() => router.push(`/nil-mri-tot/itr/verify${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`)} showMenu>
      <div className="space-y-4">

        {/* Step counter — black card, consistent with validation page */}
        <div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
          <h1 className="text-base font-semibold">Income Tax Return</h1>
          <p className="text-gray-400 text-xs">Step 1/3 - Return Information</p>
        </div>

        {/* Section header */}
        <p className="text-sm font-semibold text-gray-700">Return Information</p>

        {/* Left tab navigation */}
        <div className="flex gap-3">
          {/* Tabs */}
          <div className="flex flex-col gap-1 min-w-[110px]">
            <button
              onClick={() => setActiveTab('insurance')}
              className={`text-left text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'insurance'
                  ? 'bg-[var(--kra-red)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Insurance Policy
            </button>
            <button
              onClick={() => setActiveTab('disability')}
              className={`text-left text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'disability'
                  ? 'bg-[var(--kra-red)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Disability
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1">
            {activeTab === 'insurance' && (
              <Card className="space-y-3">
                <div className="flex items-center gap-4">
                  <p className="text-xs text-gray-600 font-medium">Do you have insurance policy?</p>
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
                    <Card className="space-y-2 border border-gray-200">
                      <Input
                        label="Insurance Company PIN"
                        placeholder="Enter insurer PIN (e.g. P051300696C)"
                        value={selectedInsurerPin}
                        onChange={(v) => {
                          const normalized = v.toUpperCase();
                          setSelectedInsurerPin(normalized);
                          setValidatedInsurer(null);
                          setInsurancePinError('');
                        }}
                        required
                      />
                      <Button
                        type="button"
                        onClick={handleValidateInsurancePin}
                        disabled={selectedInsurerPin.length !== 11 || validatingInsurancePin}
                        className="w-full"
                      >
                        {validatingInsurancePin ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Validating PIN...</> : 'Validate PIN'}
                      </Button>
                      {validatedInsurer ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs text-green-700 font-medium">
                            ✓ {validatedInsurer.companyName} ({validatedInsurer.pin})
                          </p>
                        </div>
                      ) : null}
                      {insurancePinError ? (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs text-red-600">{insurancePinError}</p>
                        </div>
                      ) : null}
                    </Card>

                    {policies.length === 0 ? (
                      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center space-y-2">
                        <p className="text-sm font-medium text-gray-700">Add Insurance Relief Details</p>
                        <p className="text-xs text-gray-500">Select Add to add details of insurance relief</p>
                        <button
                          onClick={handleOpenInsuranceModal}
                          disabled={!validatedInsurer}
                          className="px-4 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700"
                        >
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
                            <button type="button" onClick={() => handleRemovePolicy(i)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={handleOpenInsuranceModal}
                          disabled={!validatedInsurer}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <Plus className="w-3 h-3" /> Add another policy
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'disability' && (
              <Card className="space-y-3">
                <p className="text-xs text-gray-600">Have you been issued the exemption certificate for disability?</p>
                <p className="text-xs font-medium text-gray-700">Exemption Certificate Details</p>
                {loadingDisability ? (
                  <div className="flex items-center gap-2 text-gray-500 p-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Checking certificate...</span>
                  </div>
                ) : disabilityResult?.hasCertificate ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-green-800">Certificate Issued</p>
                    <p className="text-xs text-green-700 mt-1">Certificate No: {disabilityResult.certificateNumber}</p>
                  </div>
                ) : (
                  <div className="border border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-8 bg-gray-200 rounded" />
                    <div className="space-y-1 text-center">
                      <div className="w-16 h-2 bg-gray-200 rounded mx-auto" />
                      <div className="w-12 h-2 bg-gray-200 rounded mx-auto" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">No Certificate Issued</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={handleCancel} className="flex-1">Cancel</Button>
          <Button onClick={handleNext} className="flex-1">Next</Button>
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
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInsurerPin('');
                      setValidatedInsurer(null);
                      setInsurancePinError('');
                      setShowModal(false);
                    }}
                    className="text-xs text-[var(--kra-red)] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Input
                label=""
                placeholder="Enter insurer PIN (e.g. P051300696C)"
                value={validatedInsurer?.pin || selectedInsurerPin}
                onChange={setSelectedInsurerPin}
                disabled
                required
              />
              {validatedInsurer?.companyName ? (
                <p className="text-xs text-green-700">✓ {validatedInsurer.companyName}</p>
              ) : null}
            </div>

            <Select
              label="Type Of Policy"
              value={modalForm.typeOfPolicy}
              onChange={(v) => setModalForm({ ...modalForm, typeOfPolicy: v })}
              required
              options={[
                { value: 'life', label: 'Life Insurance' },
                { value: 'education', label: 'Education Policy' },
                { value: 'health', label: 'Health Insurance' },
              ]}
            />

            <Input label="Insurance Policy Number" value={modalForm.insurancePolicyNumber} onChange={(v) => setModalForm({ ...modalForm, insurancePolicyNumber: v })} required placeholder="Enter policy number" />

            <Select
              label="Policy Holder"
              value={modalForm.policyHolder}
              onChange={(v) => setModalForm({ ...modalForm, policyHolder: v })}
              required
              options={[
                { value: 'self', label: 'Self' },
                { value: 'spouse', label: 'Spouse' },
                { value: 'child', label: 'Child' },
              ]}
            />

            <Input label="Age Of Child" value={modalForm.ageOfChild || ''} onChange={(v) => setModalForm({ ...modalForm, ageOfChild: v })} placeholder="Enter age (if applicable)" />

            <Input label="Commencement Date" type="date" value={modalForm.commencementDate} onChange={(v) => setModalForm({ ...modalForm, commencementDate: v })} required />

            <Input label="Maturity Date" type="date" value={modalForm.maturityDate} onChange={(v) => setModalForm({ ...modalForm, maturityDate: v })} required />

            <Input label="Sum Assured" value={modalForm.sumAssured} onChange={(v) => setModalForm({ ...modalForm, sumAssured: v })} required type="number" placeholder="0.00" />

            <Input label="Annual Premium Paid" value={modalForm.annualPremiumPaid} onChange={(v) => {
              const premium = Number(v) || 0;
              const relief = Math.round(premium * 0.15 * 100) / 100;
              setModalForm({ ...modalForm, annualPremiumPaid: v, amountOfInsuranceRelief: String(relief) });
            }} required type="number" placeholder="0.00" />

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount Of Insurance Relief</label>
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
                {modalForm.amountOfInsuranceRelief || '0.00'}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Auto-calculated: 15% of Annual Premium Paid</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddPolicy} className="flex-1"
                disabled={!validatedInsurer || !modalForm.typeOfPolicy || !modalForm.insurancePolicyNumber || !modalForm.policyHolder || !modalForm.commencementDate || !modalForm.maturityDate || !modalForm.sumAssured || !modalForm.annualPremiumPaid || !modalForm.amountOfInsuranceRelief}
              >
                Add
              </Button>
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
