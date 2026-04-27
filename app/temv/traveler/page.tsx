'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Layout, Card, Input, Select, Button } from '../../_components/Layout';
import { FileUpload } from '../../timv/_components/FileUpload';
import { AccessoriesList, Accessory } from '../../timv/_components/AccessoriesList';
import { getCertSession, appendVehicleMetadata } from '../../_lib/cert-store';
import { updateCertificate, getCountries, getCertificate } from '../../actions/customs';

function TEMVTravelerContent() {
  const router = useRouter();
  const [session] = useState(() => getCertSession());

  const [countries, setCountries] = useState<{ value: string; label: string }[]>([]);
  const [existingVehicleDetails, setExistingVehicleDetails] = useState<Record<string, any>>({});

  const [ownerName, setOwnerName] = useState('');
  const [ownerNationality, setOwnerNationality] = useState('KE');
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
  const [ownerDrivingLicenceFile, setOwnerDrivingLicenceFile] = useState<File | null>(null);
  const [carnetDocFile, setCarnetDocFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.ref_no) {
      router.replace('/temv');
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

        const cert = certRes?.data ?? certRes;
        const vd = cert?.vehicle_details ?? {};
        const td = cert?.traveler_details ?? {};
        setExistingVehicleDetails(vd);

        if (td.owner_name) setOwnerName(td.owner_name);
        if (td.owner_nationality) setOwnerNationality(td.owner_nationality);
        if (td.owner_phone) setOwnerPhone(td.owner_phone);
        if (td.owner_email) setOwnerEmail(td.owner_email);
      } catch {
        // non-blocking
      }
    };
    load();
  }, [session, router]);

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('type', 'TEMV');
    fd.append('ref_no', session!.ref_no);

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
        if (acc.attachment) fd.append(`traveler_details[accessories][${i}][attachment]`, acc.attachment);
      });
    }

    if (ownerIdFile) fd.append('traveler_details[owner_id_attachment]', ownerIdFile);
    // TEMV uses owner_driving_license (not driver_driving_licence)
    if (ownerDrivingLicenceFile) fd.append('traveler_details[owner_driving_license]', ownerDrivingLicenceFile);
    if (isCarnet === 'yes' && carnetDocFile) fd.append('traveler_details[carnet_document_attachment]', carnetDocFile);

    appendVehicleMetadata(fd, existingVehicleDetails);

    return fd;
  };

  const handleNext = async () => {
    setSaving(true);
    setError('');
    try {
      await updateCertificate(buildFormData());
      router.push('/temv/preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save traveler details.');
    } finally {
      setSaving(false);
    }
  };

  if (!session?.ref_no) return null;

  return (
    <Layout
      title="TEMV — Traveler"
      step="Step 2 of 3"
      onBack={() => router.push('/temv/exportation')}
      showMenu
    >
      <div className="space-y-4">

        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle Owner</p>
          <Input label="Full Name" value={ownerName} onChange={setOwnerName} required />
          <Select label="Nationality" value={ownerNationality} onChange={setOwnerNationality} options={countries} required />
          <Input label="Passport / ID Number" value={ownerPassport} onChange={setOwnerPassport} />
          <Input label="Phone" type="tel" value={ownerPhone} onChange={setOwnerPhone} placeholder="+254…" />
          <Input label="Email" type="email" value={ownerEmail} onChange={setOwnerEmail} />
          <Select
            label="Is the owner driving the vehicle?"
            value={isOwner}
            onChange={setIsOwner}
            options={[
              { value: 'yes', label: 'Yes — owner is the driver' },
              { value: 'no', label: 'No — different driver' },
            ]}
          />
          <FileUpload label="Owner ID Attachment" value={ownerIdFile} onChange={setOwnerIdFile} />
          <FileUpload label="Owner Driving Licence" value={ownerDrivingLicenceFile} onChange={setOwnerDrivingLicenceFile} />
        </Card>

        {isOwner === 'no' && (
          <Card className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver Details</p>
            <Input label="Full Name" value={driverName} onChange={setDriverName} required />
            <Select label="Nationality" value={driverNationality} onChange={setDriverNationality} options={countries} required />
            <Input label="Passport / ID Number" value={driverPassport} onChange={setDriverPassport} />
            <Input label="Phone" type="tel" value={driverPhone} onChange={setDriverPhone} />
            <Input label="Email" type="email" value={driverEmail} onChange={setDriverEmail} />
          </Card>
        )}

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

        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accessories</p>
          <Select
            label="Does the vehicle have accessories?"
            value={hasAccessories}
            onChange={v => {
              setHasAccessories(v);
              if (v === 'yes' && accessories.length === 0) setAccessories([{ description: '', value: '' }]);
            }}
            options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
          />
          {hasAccessories === 'yes' && <AccessoriesList accessories={accessories} onChange={setAccessories} />}
        </Card>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={() => router.push('/temv/exportation')} className="flex-1">
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

export default function TEMVTravelerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      }
    >
      <TEMVTravelerContent />
    </Suspense>
  );
}
