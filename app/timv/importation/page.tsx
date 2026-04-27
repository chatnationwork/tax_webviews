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
} from '../../actions/customs';

const FUEL_TYPES = [
  { value: 'PTR', label: 'Petrol' },
  { value: 'DSL', label: 'Diesel' },
  { value: 'ELC', label: 'Electric' },
  { value: 'HYB', label: 'Hybrid' },
  { value: 'GAS', label: 'LPG/Gas' },
];

function daysBetween(a: string, b: string): string {
  if (!a || !b) return '';
  const diff = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return String(Math.round(diff / 86400000));
}

function TIMVImportationContent() {
  const router = useRouter();
  const [session] = useState(() => getCertSession());

  const [countries, setCountries] = useState<{ value: string; label: string }[]>([]);
  const [entryPoints, setEntryPoints] = useState<{ value: string; label: string }[]>([]);
  const [counties, setCounties] = useState<{ value: string; label: string }[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<{ value: string; label: string }[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  const [entryPort, setEntryPort] = useState('');
  const [exitPort, setExitPort] = useState('');
  const [dateOfEntry, setDateOfEntry] = useState('');
  const [dateOfExit, setDateOfExit] = useState('');
  const [destCounty, setDestCounty] = useState('');
  const [destTown, setDestTown] = useState('');
  const [vehicleRegNo, setVehicleRegNo] = useState('');
  const [regCountry, setRegCountry] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleClass, setVehicleClass] = useState('');
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
  const [withTrailer, setWithTrailer] = useState('no');
  const [trailerRegNo, setTrailerRegNo] = useState('');
  const [logbookFile, setLogbookFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);

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
        const [ctRes, epRes, coRes, vtRes] = await Promise.all([
          getCountries(),
          getEntryPoints(),
          getCertCounties(),
          getVehicleTypes(),
        ]);
        const toOpts = (arr: any[], codeKey = 'code', nameKey = 'name') =>
          Array.isArray(arr)
            ? arr.map((x: any) => ({ value: String(x[codeKey] ?? x.id), label: x[nameKey] ?? String(x[codeKey]) }))
            : [];
        setCountries(toOpts(ctRes?.data ?? ctRes));
        setEntryPoints(toOpts(epRes?.data ?? epRes));
        setCounties(toOpts(coRes?.data ?? coRes, 'code_name', 'county'));
        setVehicleTypes(toOpts(vtRes?.entries ?? vtRes?.data ?? vtRes, 'code', 'description'));
      } catch {
        // lookups failing shouldn't block the form
      } finally {
        setLookupsLoading(false);
      }
    };
    load();
  }, [session, router]);

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
    if (!logbookFile) errs.logbookFile = 'Required';
    if (!insuranceFile) errs.insuranceFile = 'Required';
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
    fd.append('vehicle_details[vehicle_type]', vehicleType);
    fd.append('vehicle_details[vehicle_class]', vehicleClass);
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
    if (logbookFile) fd.append('vehicle_details[log_book_attachment]', logbookFile);
    if (insuranceFile) fd.append('vehicle_details[insurance_attachment]', insuranceFile);
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

        {/* Travel Section */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Travel Details</p>
          <Select
            label="Entry Port"
            value={entryPort}
            onChange={setEntryPort}
            options={entryPoints}
            required
          />
          {fieldErrors.entryPort && <p className="text-xs text-red-500 -mt-2">{fieldErrors.entryPort}</p>}
          <Select
            label="Exit Port"
            value={exitPort}
            onChange={setExitPort}
            options={entryPoints}
            required
          />
          {fieldErrors.exitPort && <p className="text-xs text-red-500 -mt-2">{fieldErrors.exitPort}</p>}
          <Input
            label="Date of Entry"
            type="date"
            value={dateOfEntry}
            onChange={v => {
              setDateOfEntry(v);
            }}
            required
            error={fieldErrors.dateOfEntry}
          />
          <Input
            label="Expected Date of Exit"
            type="date"
            value={dateOfExit}
            onChange={setDateOfExit}
            required
            error={fieldErrors.dateOfExit}
          />
          {dateOfEntry && dateOfExit && (
            <p className="text-xs text-gray-500">
              Period of stay: <span className="font-medium">{daysBetween(dateOfEntry, dateOfExit)} days</span>
            </p>
          )}
        </Card>

        {/* Destination */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Destination</p>
          <Select
            label="Destination County"
            value={destCounty}
            onChange={setDestCounty}
            options={counties}
          />
          <Input
            label="Destination Town"
            value={destTown}
            onChange={setDestTown}
            placeholder="e.g. Malindi"
          />
        </Card>

        {/* Vehicle Registration */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle Registration</p>
          <Input
            label="Vehicle Registration Number"
            value={vehicleRegNo}
            onChange={setVehicleRegNo}
            placeholder="e.g. KCY809T"
            required
            error={fieldErrors.vehicleRegNo}
          />
          <Select
            label="Country of Registration"
            value={regCountry}
            onChange={setRegCountry}
            options={countries}
            required
          />
          {fieldErrors.regCountry && <p className="text-xs text-red-500 -mt-2">{fieldErrors.regCountry}</p>}
        </Card>

        {/* Vehicle Specification */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle Specification</p>
          <Select
            label="Vehicle Type"
            value={vehicleType}
            onChange={setVehicleType}
            options={vehicleTypes}
          />
          <Input
            label="Vehicle Class"
            value={vehicleClass}
            onChange={setVehicleClass}
            placeholder="e.g. MVS_PMV"
          />
          <Input label="Make" value={make} onChange={setMake} placeholder="e.g. Toyota" required error={fieldErrors.make} />
          <Input label="Model" value={model} onChange={setModel} placeholder="e.g. Land Cruiser" required error={fieldErrors.model} />
          <Input label="Year of Manufacture" type="number" value={yearOfManufacture} onChange={setYearOfManufacture} placeholder="e.g. 2020" required error={fieldErrors.yearOfManufacture} />
          <Input label="Colour" value={color} onChange={setColor} placeholder="e.g. #ffffff or White" />
          <Select label="Fuel Type" value={fuelType} onChange={setFuelType} options={FUEL_TYPES} />
          <Input label="Engine Number" value={engineNo} onChange={setEngineNo} />
          <Input label="Engine Capacity (cc)" type="number" value={engineCapacity} onChange={setEngineCapacity} />
          <Input label="Seating Capacity" type="number" value={seatingCapacity} onChange={setSeatingCapacity} />
          <Input label="Axles" type="number" value={axles} onChange={setAxles} />
          <Input label="Tare Weight (kg)" type="number" value={tareWeight} onChange={setTareWeight} />
          <Input label="Value of Vehicle (KES)" type="number" value={valueOfVehicle} onChange={setValueOfVehicle} />
        </Card>

        {/* Vehicle Documents */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle Documents</p>
          <Input label="Logbook Number" value={logbookNo} onChange={setLogbookNo} required error={fieldErrors.logbookNo} />
          <Input label="Chassis Number" value={chassisNo} onChange={setChassisNo} required error={fieldErrors.chassisNo} />
          <FileUpload label="Logbook Attachment" value={logbookFile} onChange={setLogbookFile} required error={fieldErrors.logbookFile} />
          <FileUpload label="Insurance Certificate" value={insuranceFile} onChange={setInsuranceFile} required error={fieldErrors.insuranceFile} />
        </Card>

        {/* Trailer */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trailer</p>
          <Select
            label="With Trailer?"
            value={withTrailer}
            onChange={setWithTrailer}
            options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
          />
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
