'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Layout, Card, Input, Select, Button } from '../../_components/Layout';
import { FileUpload } from '../_components/FileUpload';
import { getCertSession } from '../../_lib/cert-store';
import {
  updateCertificate,
  getCountries,
  getEntryPoints,
  getCertCounties,
  getVehicleTypes,
  getVehicleMakes,
  getVehicleModels,
  getTowns,
} from '../../actions/customs';

const FUEL_TYPES = [
  { value: 'PTR', label: 'Petrol' },
  { value: 'DSL', label: 'Diesel' },
  { value: 'ELC', label: 'Electric' },
  { value: 'HYB', label: 'Hybrid' },
];

const VEHICLE_CLASSES = [
  { value: 'MVS_PMV', label: 'Private Motor Vehicle' },
  { value: 'MVS_CMV', label: 'Commercial Motor Vehicle' },
];

const COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#ffffff', label: 'White' },
  { value: '#c0c0c0', label: 'Silver' },
  { value: '#808080', label: 'Grey' },
  { value: '#0000ff', label: 'Blue' },
  { value: '#ff0000', label: 'Red' },
  { value: '#008000', label: 'Green' },
  { value: '#ffff00', label: 'Yellow' },
  { value: '#ffa500', label: 'Orange' },
  { value: '#800000', label: 'Maroon' },
  { value: '#a52a2a', label: 'Brown' },
  { value: '#ffd700', label: 'Gold' },
  { value: '#000080', label: 'Navy Blue' },
  { value: '#f5f5dc', label: 'Beige' },
  { value: '#800080', label: 'Purple' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1969 }, (_, i) => {
  const y = String(currentYear - i);
  return { value: y, label: y };
});

type Opt = { value: string; label: string };

function daysBetween(a: string, b: string) {
  if (!a || !b) return '';
  return String(Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

function TIMVImportationContent() {
  const router = useRouter();
  const [session] = useState(() => getCertSession());

  // Lookups
  const [countries, setCountries] = useState<Opt[]>([]);
  const [entryPoints, setEntryPoints] = useState<Opt[]>([]);
  const [counties, setCounties] = useState<{ value: string; label: string; numericCode: number }[]>([]);
  const [allTowns, setAllTowns] = useState<{ county_code: number; name: string }[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<Opt[]>([]);
  const [makes, setMakes] = useState<Opt[]>([]);
  const [allModels, setAllModels] = useState<{ code: string; description: string; parent_code: string }[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  // Travel
  const [entryPort, setEntryPort] = useState('');
  const [exitPort, setExitPort] = useState('');
  const [dateOfEntry, setDateOfEntry] = useState('');
  const [dateOfExit, setDateOfExit] = useState('');
  const [destCounty, setDestCounty] = useState('');
  const [destTown, setDestTown] = useState('');

  // Vehicle identity
  const [vehicleRegNo, setVehicleRegNo] = useState('');
  const [regCountry, setRegCountry] = useState('');
  const [vehicleClass, setVehicleClass] = useState('MVS_PMV');

  // Vehicle spec
  const [vehicleType, setVehicleType] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [yearOfManufacture, setYearOfManufacture] = useState('');
  const [color, setColor] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [engineCapacity, setEngineCapacity] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState('');
  const [axles, setAxles] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const [valueOfVehicle, setValueOfVehicle] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [logbookNo, setLogbookNo] = useState('');

  // Trailer
  const [withTrailer, setWithTrailer] = useState('no');
  const [trailerRegNo, setTrailerRegNo] = useState('');

  // Files
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [logbookFile, setLogbookFile] = useState<File | null>(null); // inspection cert or transit good license

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!session?.ref_no) {
      router.replace('/timv');
      return;
    }
    const load = async () => {
      setLookupsLoading(true);
      try {
        const [ctRes, epRes, coRes, vtRes, mkRes, mdRes, tnRes] = await Promise.all([
          getCountries(),
          getEntryPoints(),
          getCertCounties(),
          getVehicleTypes(),
          getVehicleMakes(),
          getVehicleModels(),
          getTowns(),
        ]);

        const toOpts = (arr: any[], codeKey = 'code', nameKey = 'name'): Opt[] =>
          Array.isArray(arr)
            ? arr.map(x => ({ value: String(x[codeKey] ?? x.id), label: x[nameKey] ?? String(x[codeKey]) }))
            : [];

        setCountries(toOpts(ctRes?.data ?? ctRes));
        setEntryPoints(toOpts(epRes?.data ?? epRes));

        const rawCounties: any[] = coRes?.data ?? coRes ?? [];
        setCounties(
          Array.isArray(rawCounties)
            ? rawCounties.map(x => ({ value: x.code_name, label: x.county, numericCode: x.code }))
            : [],
        );

        setVehicleTypes(toOpts(vtRes?.entries ?? vtRes?.data ?? vtRes, 'code', 'description'));
        setMakes(toOpts(mkRes?.entries ?? mkRes?.data ?? mkRes, 'code', 'description'));

        const rawModels: any[] = mdRes?.entries ?? mdRes?.data ?? mdRes ?? [];
        setAllModels(
          Array.isArray(rawModels)
            ? rawModels.map(x => ({ code: x.code, description: x.description, parent_code: x.parent_code }))
            : [],
        );

        setAllTowns(Array.isArray(tnRes) ? tnRes : tnRes?.data ?? []);
      } catch {
        // non-blocking
      } finally {
        setLookupsLoading(false);
      }
    };
    load();
  }, [session, router]);

  // Derived: models filtered by selected make
  const modelOptions: Opt[] = make
    ? allModels
        .filter(m => m.parent_code === make)
        .map(m => ({ value: m.code, label: m.description }))
    : [];

  // Derived: towns filtered by selected county's numeric code
  const selectedCountyObj = counties.find(c => c.value === destCounty);
  const townOptions: Opt[] = selectedCountyObj
    ? allTowns
        .filter(t => t.county_code === selectedCountyObj.numericCode)
        .map(t => ({ value: t.name, label: t.name }))
    : [];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!entryPort) errs.entryPort = 'Required';
    if (!exitPort) errs.exitPort = 'Required';
    if (!dateOfEntry) errs.dateOfEntry = 'Required';
    if (!dateOfExit) errs.dateOfExit = 'Required';
    if (!vehicleRegNo) errs.vehicleRegNo = 'Required';
    if (!regCountry) errs.regCountry = 'Required';
    if (!make) errs.make = 'Required';
    if (!model) errs.model = 'Required';
    if (!yearOfManufacture) errs.yearOfManufacture = 'Required';
    if (!chassisNo) errs.chassisNo = 'Required';
    if (!logbookNo) errs.logbookNo = 'Required';
    if (!insuranceFile) errs.insuranceFile = 'Required';
    if (!logbookFile) errs.logbookFile = 'Required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('type', 'TIMV');
    fd.append('ref_no', session!.ref_no);
    fd.append('vehicle_reg_no', vehicleRegNo);
    fd.append('vehicle_details[entry_port]', entryPort);
    fd.append('vehicle_details[exit_port]', exitPort);
    fd.append('vehicle_details[date_of_entry]', dateOfEntry);
    fd.append('vehicle_details[date_of_exit]', dateOfExit);
    fd.append('vehicle_details[period_of_stay]', daysBetween(dateOfEntry, dateOfExit) || '0');
    fd.append('vehicle_details[destination_county]', destCounty);
    fd.append('vehicle_details[destination_town]', destTown);
    fd.append('vehicle_details[vehicle_reg_no]', vehicleRegNo);
    fd.append('vehicle_details[registration_country]', regCountry);
    fd.append('vehicle_details[vehicle_class]', vehicleClass);
    fd.append('vehicle_details[vehicle_type]', vehicleType);
    fd.append('vehicle_details[make]', make);
    fd.append('vehicle_details[model]', model);
    fd.append('vehicle_details[year_of_manufacture]', yearOfManufacture);
    fd.append('vehicle_details[color]', color);
    fd.append('vehicle_details[fuel_type]', fuelType);
    fd.append('vehicle_details[engine_no]', engineNo);
    fd.append('vehicle_details[engine_capacity]', engineCapacity);
    fd.append('vehicle_details[seating_capacity]', seatingCapacity);
    fd.append('vehicle_details[axles]', axles);
    fd.append('vehicle_details[tare_weight]', tareWeight);
    fd.append('vehicle_details[value_of_vehicle]', valueOfVehicle);
    fd.append('vehicle_details[chassis_no]', chassisNo);
    fd.append('vehicle_details[logbook_no]', logbookNo);
    fd.append('vehicle_details[with_trailer]', withTrailer);
    if (withTrailer === 'yes') fd.append('vehicle_details[trailer_reg_no]', trailerRegNo);
    if (insuranceFile) fd.append('vehicle_details[insurance_attachment]', insuranceFile);
    if (logbookFile) fd.append('vehicle_details[log_book_attachment]', logbookFile);
    return fd;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setSaving(true);
    setError('');
    try {
      await updateCertificate(buildFormData());
      router.push('/timv/traveler');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save vehicle details.');
    } finally {
      setSaving(false);
    }
  };

  if (!session?.ref_no) return null;

  return (
    <Layout
      title="TIMV — Importation"
      step="Step 1 of 3"
      onBack={() => router.push('/timv')}
      showMenu
    >
      <div className="space-y-4">
        {lookupsLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading form options…
          </div>
        )}

        {/* Importation Details */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Importation Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select label="Entry Port" value={entryPort} onChange={setEntryPort} options={entryPoints} required />
              {fieldErrors.entryPort && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.entryPort}</p>}
            </div>
            <div>
              <Select label="Expected Exit Port" value={exitPort} onChange={setExitPort} options={entryPoints} required />
              {fieldErrors.exitPort && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.exitPort}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date Of Entry" type="date" value={dateOfEntry} onChange={setDateOfEntry} required error={fieldErrors.dateOfEntry} />
            <Input label="Expected Date Of Exit" type="date" value={dateOfExit} onChange={setDateOfExit} required error={fieldErrors.dateOfExit} />
          </div>
          <Input
            label="Period Of Stay (days)"
            type="number"
            value={daysBetween(dateOfEntry, dateOfExit) || '0'}
            onChange={() => {}}
            disabled
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Destination County"
              value={destCounty}
              onChange={v => { setDestCounty(v); setDestTown(''); }}
              options={counties}
            />
            <Select
              label="Destination Town"
              value={destTown}
              onChange={setDestTown}
              options={townOptions}
              disabled={!destCounty}
            />
          </div>
        </Card>

        {/* Vehicle Details */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle Details</p>

          {/* Vehicle Class radio */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Vehicle Class / Usage <span className="text-red-500">*</span></p>
            <div className="flex gap-4">
              {VEHICLE_CLASSES.map(vc => (
                <label key={vc.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="vehicleClass"
                    value={vc.value}
                    checked={vehicleClass === vc.value}
                    onChange={() => setVehicleClass(vc.value)}
                    className="accent-[var(--kra-red)]"
                  />
                  <span className="text-xs text-gray-700">{vc.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input label="Vehicle Registration No." value={vehicleRegNo} onChange={setVehicleRegNo} placeholder="KCY809T" required error={fieldErrors.vehicleRegNo} />
            </div>
            <div>
              <Select label="Country Of Registration" value={regCountry} onChange={setRegCountry} options={countries} required />
              {fieldErrors.regCountry && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.regCountry}</p>}
            </div>
          </div>

          <Input label="Value Of Vehicle (KES)" type="number" value={valueOfVehicle} onChange={setValueOfVehicle} placeholder="1200000" />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Year Of Manufacture" value={yearOfManufacture} onChange={setYearOfManufacture} options={YEARS} required />
            {fieldErrors.yearOfManufacture && <p className="text-xs text-red-500 -mt-2 col-span-2">{fieldErrors.yearOfManufacture}</p>}
            <Select label="Colour" value={color} onChange={setColor} options={COLORS} />
          </div>

          <Select label="Vehicle Type" value={vehicleType} onChange={setVehicleType} options={vehicleTypes} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Make"
                value={make}
                onChange={v => { setMake(v); setModel(''); }}
                options={makes}
                required
              />
              {fieldErrors.make && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.make}</p>}
            </div>
            <div>
              <Select
                label="Model"
                value={model}
                onChange={setModel}
                options={modelOptions}
                disabled={!make}
                required
              />
              {fieldErrors.model && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.model}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Chassis Number" value={chassisNo} onChange={setChassisNo} required error={fieldErrors.chassisNo} />
            <Input label="Logbook Number" value={logbookNo} onChange={setLogbookNo} required error={fieldErrors.logbookNo} />
          </div>

          <Select label="Fuel Type" value={fuelType} onChange={setFuelType} options={FUEL_TYPES} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Engine Number" value={engineNo} onChange={setEngineNo} />
            <Input label="Engine Capacity (cc)" type="number" value={engineCapacity} onChange={setEngineCapacity} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Seating Capacity" type="number" value={seatingCapacity} onChange={setSeatingCapacity} />
            <Input label="Number Of Axles" type="number" value={axles} onChange={setAxles} />
            <Input label="Tare Weight (Kg)" type="number" value={tareWeight} onChange={setTareWeight} />
          </div>
        </Card>

        {/* Documents */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents</p>
          <FileUpload
            label="Upload Insurance Document"
            value={insuranceFile}
            onChange={setInsuranceFile}
            required
            error={fieldErrors.insuranceFile}
          />
          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <p className="text-xs font-medium text-gray-600">Either Or <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-2 gap-3">
              <FileUpload
                label="Upload Inspection Certificate"
                value={logbookFile}
                onChange={v => { setLogbookFile(v); }}
                error={!logbookFile ? fieldErrors.logbookFile : undefined}
              />
              <FileUpload
                label="Upload Transit Good License"
                value={null}
                onChange={v => { if (v) setLogbookFile(v); }}
                error={undefined}
              />
            </div>
          </div>
        </Card>

        {/* Trailer */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trailer</p>
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">With Trailer? <span className="text-red-500">*</span></p>
            <div className="flex gap-4">
              {[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="withTrailer"
                    value={opt.value}
                    checked={withTrailer === opt.value}
                    onChange={() => setWithTrailer(opt.value)}
                    className="accent-[var(--kra-red)]"
                  />
                  <span className="text-xs text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          {withTrailer === 'yes' && (
            <Input label="Trailer Registration Number" value={trailerRegNo} onChange={setTrailerRegNo} />
          )}
        </Card>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={() => router.push('/timv')} className="flex-1">
            Back
          </Button>
          <Button onClick={handleNext} disabled={saving} className="flex-1">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Saving…</> : 'Next'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function TIMVImportationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      }
    >
      <TIMVImportationContent />
    </Suspense>
  );
}
