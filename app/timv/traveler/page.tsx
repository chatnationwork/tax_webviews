'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Layout, Card, Input, Select, Button } from '../../_components/Layout';
import { FileUpload } from '../_components/FileUpload';
import { AccessoriesList, Accessory } from '../_components/AccessoriesList';
import { getCertSession, appendVehicleMetadata } from '../../_lib/cert-store';
import { updateCertificate, getCountries, getCertificate } from '../../actions/customs';

function TIMVTravelerContent() {
  const router = useRouter();
  const [session] = useState(() => getCertSession());

  const [countries, setCountries] = useState<{ value: string; label: string }[]>([]);
  const [existingVehicleDetails, setExistingVehicleDetails] = useState<Record<string, any>>({});

  const [ownerName, setOwnerName] = useState('');
  const [ownerNationality, setOwnerNationality] = useState('');
  const [ownerPassport, setOwnerPassport] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [isOwner, setIsOwner] = useState('yes');
  const [driverName, setDriverName] = useState('');
  const [driverNationality, setDriverNationality] = useState('');
  const [driverPassport, setDriverPassport] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [isCarnet, setIsCarnet] = useState('no');
  const [carnetNo, setCarnetNo] = useState('');
  const [carnetExpiry, setCarnetExpiry] = useState('');
  const [issuingCountry, setIssuingCountry] = useState('');
  const [issuingAssociation, setIssuingAssociation] = useState('');
  const [assocPhone, setAssocPhone] = useState('');
  const [assocEmail, setAssocEmail] = useState('');
  const [assocFax, setAssocFax] = useState('');
  const [hasAccessories, setHasAccessories] = useState('no');
  const [accessories, setAccessories] = useState<Accessory[]>([]);

  const [ownerIdFile, setOwnerIdFile] = useState<File | null>(null);
  const [ownerLicenceFile, setOwnerLicenceFile] = useState<File | null>(null);
  const [driverIdFile, setDriverIdFile] = useState<File | null>(null);
  const [driverLicenceFile, setDriverLicenceFile] = useState<File | null>(null);
  const [authorityLetterFile, setAuthorityLetterFile] = useState<File | null>(null);
  const [carnetDocFile, setCarnetDocFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.ref_no) {
      router.replace('/timv');
      return;
    }
    const load = async () => {
      try {
        const [ctRes, certRes] = await Promise.all([
          getCountries(),
          getCertificate(session.ref_no),
        ]);
        const toOpts = (arr: any[]) =>
          Array.isArray(arr)
            ? arr.map((x: any) => ({ value: x.code ?? x.id, label: x.name ?? x.code }))
            : [];
        setCountries(toOpts(ctRes?.data ?? ctRes));
        const vd = certRes?.data?.vehicle_details ?? certRes?.vehicle_details ?? {};
        setExistingVehicleDetails(vd);
      } catch {
        // non-blocking
      }
    };
    load();
  }, [session, router]);

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('type', 'TIMV');
    fd.append('ref_no', session!.ref_no);

    // Traveler details
    fd.append('traveler_details[owner_name]', ownerName);
    fd.append('traveler_details[owner_nationality]', ownerNationality);
    fd.append('traveler_details[owner_passport]', ownerPassport);
    fd.append('traveler_details[owner_phone]', ownerPhone);
    fd.append('traveler_details[owner_email]', ownerEmail);
    fd.append('traveler_details[is_owner]', isOwner);

    if (isOwner === 'no') {
      fd.append('traveler_details[driver_name]', driverName);
      fd.append('traveler_details[driver_nationality]', driverNationality);
      fd.append('traveler_details[driver_passport]', driverPassport);
      fd.append('traveler_details[driver_phone]', driverPhone);
      fd.append('traveler_details[driver_email]', driverEmail);
    }

    fd.append('traveler_details[is_carnet]', isCarnet);
    if (isCarnet === 'yes') {
      fd.append('traveler_details[carnet_no]', carnetNo);
      fd.append('traveler_details[carnet_expiry_date]', carnetExpiry);
      fd.append('traveler_details[issuing_country]', issuingCountry);
      fd.append('traveler_details[issuing_associations]', issuingAssociation);
      fd.append('traveler_details[issuing_association_phone]', assocPhone);
      fd.append('traveler_details[issuing_association_email]', assocEmail);
      fd.append('traveler_details[issuing_association_fax]', assocFax);
    }

    fd.append('traveler_details[has_accessories]', hasAccessories);
    if (hasAccessories === 'yes') {
      accessories.forEach((acc, i) => {
        fd.append(`traveler_details[accessories][${i}][description]`, acc.description);
        fd.append(`traveler_details[accessories][${i}][value]`, acc.value);
        if (acc.attachment) {
          fd.append(`traveler_details[accessories][${i}][attachment]`, acc.attachment);
        }
      });
    }

    // File attachments
    if (ownerIdFile) fd.append('traveler_details[owner_id_attachment]', ownerIdFile);
    if (ownerLicenceFile) fd.append('traveler_details[owner_driving_license]', ownerLicenceFile);
    if (isOwner === 'no') {
      if (driverIdFile) fd.append('traveler_details[driver_id_attachment]', driverIdFile);
      if (driverLicenceFile) fd.append('traveler_details[driver_driving_licence]', driverLicenceFile);
      if (authorityLetterFile) fd.append('traveler_details[authority_letter_attachment]', authorityLetterFile);
    }
    if (isCarnet === 'yes' && carnetDocFile) {
      fd.append('traveler_details[carnet_document_attachment]', carnetDocFile);
    }

    // Re-send existing vehicle details (including file metadata)
    appendVehicleMetadata(fd, existingVehicleDetails);

    return fd;
  };

  const handleNext = async () => {
    setSaving(true);
    setError('');
    try {
      await updateCertificate(buildFormData());
      router.push('/timv/preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save traveler details.');
    } finally {
      setSaving(false);
    }
  };

  if (!session?.ref_no) return null;

  return (
    <Layout
      title="TIMV — Traveler"
      step="Step 2 of 3"
      onBack={() => router.push('/timv/importation')}
      showMenu
    >
      <div className="space-y-4">

        {/* Owner */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner's Details</p>
          <Input label="Owner's Name" value={ownerName} onChange={setOwnerName} required />
          <Select label="Owner's Nationality" value={ownerNationality} onChange={setOwnerNationality} options={countries} required />
          <Input label="Owner's Passport Number, Issued By (Country)" value={ownerPassport} onChange={setOwnerPassport} required />
          <Input label="Owner's Phone Number" type="tel" value={ownerPhone} onChange={setOwnerPhone} placeholder="+254…" required />
          <Input label="Owner's Email Address" type="email" value={ownerEmail} onChange={setOwnerEmail} required />
          <FileUpload label="Upload Owner's ID/Passport" value={ownerIdFile} onChange={setOwnerIdFile} required />
          <FileUpload label="Upload Owner's Driving License" value={ownerLicenceFile} onChange={setOwnerLicenceFile} />
        </Card>

        {/* Driver toggle */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver's Details</p>
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Is owner the driver? <span className="text-red-500">*</span></p>
            <div className="flex gap-4">
              {[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isOwner"
                    value={opt.value}
                    checked={isOwner === opt.value}
                    onChange={() => setIsOwner(opt.value)}
                    className="accent-[var(--kra-red)]"
                  />
                  <span className="text-xs text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </Card>

        {/* Driver fields (conditional) */}
        {isOwner === 'no' && (
          <Card className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver's Details</p>
            <Input label="Full Name" value={driverName} onChange={setDriverName} required />
            <Select label="Nationality" value={driverNationality} onChange={setDriverNationality} options={countries} required />
            <Input label="Passport / ID Number" value={driverPassport} onChange={setDriverPassport} />
            <Input label="Phone" type="tel" value={driverPhone} onChange={setDriverPhone} placeholder="+254…" />
            <Input label="Email" type="email" value={driverEmail} onChange={setDriverEmail} />
            <FileUpload label="Driver ID Attachment" value={driverIdFile} onChange={setDriverIdFile} />
            <FileUpload label="Driver Driving Licence" value={driverLicenceFile} onChange={setDriverLicenceFile} />
            <FileUpload label="Authority Letter" value={authorityLetterFile} onChange={setAuthorityLetterFile} />
          </Card>
        )}

        {/* Carnet */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Carnet de Passages</p>
          <Select
            label="Does the vehicle have a Carnet?"
            value={isCarnet}
            onChange={setIsCarnet}
            options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
          />
          {isCarnet === 'yes' && (
            <>
              <Input label="Carnet Number" value={carnetNo} onChange={setCarnetNo} required />
              <Input label="Carnet Expiry Date" type="date" value={carnetExpiry} onChange={setCarnetExpiry} required />
              <Select label="Issuing Country" value={issuingCountry} onChange={setIssuingCountry} options={countries} required />
              <Input label="Issuing Association" value={issuingAssociation} onChange={setIssuingAssociation} />
              <Input label="Association Phone" type="tel" value={assocPhone} onChange={setAssocPhone} />
              <Input label="Association Email" type="email" value={assocEmail} onChange={setAssocEmail} />
              <Input label="Association Fax" value={assocFax} onChange={setAssocFax} />
              <FileUpload label="Carnet Document" value={carnetDocFile} onChange={setCarnetDocFile} required />
            </>
          )}
        </Card>

        {/* Accessories */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accessories</p>
          <Select
            label="Does the vehicle have accessories?"
            value={hasAccessories}
            onChange={v => {
              setHasAccessories(v);
              if (v === 'yes' && accessories.length === 0) {
                setAccessories([{ description: '', value: '' }]);
              }
            }}
            options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
          />
          {hasAccessories === 'yes' && (
            <AccessoriesList accessories={accessories} onChange={setAccessories} />
          )}
        </Card>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={() => router.push('/timv/importation')} className="flex-1">
            Back
          </Button>
          <Button onClick={handleNext} disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                Saving…
              </>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function TIMVTravelerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      }
    >
      <TIMVTravelerContent />
    </Suspense>
  );
}
