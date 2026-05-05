'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { Layout, Card, Input, Select, Button } from '../../_components/Layout';
import { FileUpload } from '../../timv/_components/FileUpload';
import { getCertSession, saveCertSession, flattenToFormData } from '../../_lib/cert-store';
import {
  validateVehicle,
  verifyOwner,
  updateCertificate,
  getCountries,
  getEntryPoints,
  getVehicleTypes,
} from '../../actions/customs';

const FUEL_TYPES = [
  { value: 'PTR', label: 'Petrol' },
  { value: 'DSL', label: 'Diesel' },
  { value: 'ELC', label: 'Electric' },
  { value: 'HYB', label: 'Hybrid' },
];

function daysBetween(a: string, b: string): string {
  if (!a || !b) return '';
  const diff = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return String(Math.round(diff / 86400000));
}

function TEMVExportationContent() {
  const router = useRouter();
  const [session] = useState(() => getCertSession());

  const [countries, setCountries] = useState<{ value: string; label: string }[]>([]);
  const [entryPoints, setEntryPoints] = useState<{ value: string; label: string }[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<{ value: string; label: string }[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  // OTP gate state
  const [regNo, setRegNo] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [vehicleData, setVehicleData] = useState<Record<string, any>>({});

  // Travel
  const [exitPort, setExitPort] = useState('');
  const [entryPort, setEntryPort] = useState('');
  const [dateOfExit, setDateOfExit] = useState('');
  const [dateOfEntry, setDateOfEntry] = useState('');
  const [destCountry, setDestCountry] = useState('');
  const [withTrailer, setWithTrailer] = useState('no');
  const [trailerRegNo, setTrailerRegNo] = useState('');

  // Vehicle (pre-populated from registry)
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
  const [regCountry, setRegCountry] = useState('KE');

  const [logbookFile, setLogbookFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!session?.ref_no) {
      router.replace('/temv');
      return;
    }
    const load = async () => {
      setLookupsLoading(true);
      try {
        const [ctRes, epRes, vtRes] = await Promise.all([
          getCountries(),
          getEntryPoints(),
          getVehicleTypes(),
        ]);
        const toOpts = (arr: any[], codeKey = 'code', nameKey = 'name') =>
          Array.isArray(arr)
            ? arr.map((x: any) => ({ value: String(x[codeKey] ?? x.id), label: x[nameKey] ?? String(x[codeKey]) }))
            : [];
        setCountries(toOpts(ctRes?.data ?? ctRes));
        setEntryPoints(toOpts(epRes?.data ?? epRes));
        setVehicleTypes(toOpts(vtRes?.entries ?? vtRes?.data ?? vtRes, 'code', 'description'));
      } catch {
        // non-blocking
      } finally {
        setLookupsLoading(false);
      }
    };
    load();
  }, [session, router]);

  const handleSendOtp = async () => {
    if (!regNo.trim()) {
      setOtpError('Enter a vehicle registration number first.');
      return;
    }
    setSendingOtp(true);
    setOtpError('');
    try {
      await validateVehicle(regNo.trim());
      setOtpSent(true);
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Failed to validate vehicle.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setOtpError('Enter the OTP sent to the registered phone.');
      return;
    }
    setVerifying(true);
    setOtpError('');
    try {
      const res = await verifyOwner(otpCode.trim(), regNo.trim());
      const vd: Record<string, any> = res?.data ?? res ?? {};
      setVehicleData(vd);

      // Pre-populate from registry
      const v = vd?.vehicle_details?.vehicle ?? vd?.vehicle ?? {};
      const owner = vd?.vehicle_details?.owner?.[0] ?? vd?.owner?.[0] ?? {};
      setMake(v.carMake ?? '');
      setModel(v.carModel ?? '');
      setYearOfManufacture(String(v.yearOfManufacture ?? ''));
      setColor(v.bodyColor ?? '');
      setEngineNo(v.engineNumber ?? '');
      setEngineCapacity(String(v.engineCapacity ?? ''));
      setSeatingCapacity(String(v.passengerCapacity ?? ''));
      setTareWeight(String(v.tareweight ?? ''));
      setChassisNo(v.ChassisNo ?? vd?.vehicle_details?.chassisNumber ?? '');
      setLogbookNo(v.logbookNumber?.LOGBOOK_NUMBER ?? '');
      setVehicleClass(v.bodyType ?? '');
      setFuelType(v.fuel_type ?? '');

      saveCertSession({ vehicle_data: vd });
      setVerified(true);
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Verification failed. Check the OTP and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('type', 'TEMV');
    fd.append('ref_no', session!.ref_no);
    fd.append('vehicle_reg_no', regNo);

    // Traveler owner pre-populated from registry
    const owner = vehicleData?.vehicle_details?.owner?.[0] ?? vehicleData?.owner?.[0] ?? {};
    if (owner.FIRSTNAME) {
      fd.append('traveler_details[owner_name]', `${owner.FIRSTNAME} ${owner.MIDDLENAME ?? ''} ${owner.LASTNAME ?? ''}`.trim());
      fd.append('traveler_details[owner_nationality]', 'KE');
      fd.append('traveler_details[owner_phone]', owner.TELNO ?? '');
    }

    // Vehicle details
    fd.append('vehicle_details[vehicle_reg_no]', regNo);
    fd.append('vehicle_details[exit_port]', exitPort);
    fd.append('vehicle_details[entry_port]', entryPort);
    fd.append('vehicle_details[date_of_exit]', dateOfExit);
    fd.append('vehicle_details[date_of_entry]', dateOfEntry);
    fd.append('vehicle_details[period_of_stay]', daysBetween(dateOfExit, dateOfEntry) || '0');
    fd.append('vehicle_details[destination_country]', destCountry);
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
    fd.append('vehicle_details[is_valid_vehicle]', 'true');
    fd.append('vehicle_details[owner_verified]', 'true');
    fd.append('vehicle_details[is_valid_trailer]', 'false');
    fd.append('vehicle_details[trailer_owner_verified]', 'false');
    if (withTrailer === 'yes') fd.append('vehicle_details[trailer_reg_no]', trailerRegNo);
    if (logbookFile) fd.append('vehicle_details[log_book_attachment]', logbookFile);
    if (insuranceFile) fd.append('vehicle_details[insurance_attachment]', insuranceFile);

    // Echo back nested vehicle registry data
    if (vehicleData && Object.keys(vehicleData).length > 0) {
      flattenToFormData(vehicleData, fd, 'vehicle_details[vehicle_details]');
    }

    return fd;
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!verified) errs.otp = 'Complete vehicle verification first.';
    if (!exitPort) errs.exitPort = 'Required';
    if (!dateOfExit) errs.dateOfExit = 'Required';
    if (!logbookFile) errs.logbookFile = 'Required';
    if (!insuranceFile) errs.insuranceFile = 'Required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setSaving(true);
    setError('');
    try {
      await updateCertificate(buildFormData());
      router.push('/temv/traveler');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save exportation details.');
    } finally {
      setSaving(false);
    }
  };

  if (!session?.ref_no) return null;

  return (
    <Layout
      title="TEMV — Exportation"
      step="Step 1 of 3"
      onBack={() => router.push('/temv')}
      showMenu
    >
      <div className="space-y-4">

        {lookupsLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading form options…
          </div>
        )}

        {/* OTP Gate */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Vehicle Verification
          </p>

          {verified ? (
            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-xs text-green-800 font-medium">
                Vehicle <span className="font-mono">{regNo}</span> verified
              </span>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="Vehicle Reg Number"
                    value={regNo}
                    onChange={setRegNo}
                    placeholder="e.g. KCX809T"
                    disabled={otpSent}
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || otpSent}
                    className="mb-0.5 px-3 py-2 text-xs bg-[var(--kra-red)] text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    {sendingOtp ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    {otpSent ? 'Sent' : 'Send OTP'}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    Enter the OTP sent to the phone number registered to this vehicle.
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        label="OTP Code"
                        value={otpCode}
                        onChange={setOtpCode}
                        placeholder="e.g. KGBRGE"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={verifying}
                        className="mb-0.5 px-3 py-2 text-xs bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
                      >
                        {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Verify'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {otpSent && (
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setOtpError('');
                  }}
                  className="text-xs text-[var(--kra-red)] underline"
                >
                  Change registration number
                </button>
              )}
            </>
          )}

          {otpError && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{otpError}</p>
            </div>
          )}
        </Card>

        {/* Travel */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Travel Details</p>
          <Select
            label="Exit Port"
            value={exitPort}
            onChange={setExitPort}
            options={entryPoints}
            required
          />
          {fieldErrors.exitPort && <p className="text-xs text-red-500 -mt-2">{fieldErrors.exitPort}</p>}
          <Select
            label="Expected Entry Port (on return)"
            value={entryPort}
            onChange={setEntryPort}
            options={entryPoints}
          />
          <Input
            label="Date of Exit"
            type="date"
            value={dateOfExit}
            onChange={setDateOfExit}
            required
            error={fieldErrors.dateOfExit}
          />
          <Input
            label="Expected Date of Return"
            type="date"
            value={dateOfEntry}
            onChange={setDateOfEntry}
          />
          {dateOfExit && dateOfEntry && (
            <p className="text-xs text-gray-500">
              Period abroad: <span className="font-medium">{daysBetween(dateOfExit, dateOfEntry)} days</span>
            </p>
          )}
        </Card>

        {/* Destination */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Destination</p>
          <Select
            label="Destination Country"
            value={destCountry}
            onChange={setDestCountry}
            options={countries}
            required
          />
        </Card>

        {/* Vehicle details — pre-populated from registry, editable */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle Details</p>
          {verified && (
            <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
              <CheckCircle className="w-3 h-3" /> Pre-populated from KRA registry — edit if needed
            </div>
          )}
          <Select label="Vehicle Type" value={vehicleType} onChange={setVehicleType} options={vehicleTypes} />
          <Input label="Vehicle Class" value={vehicleClass} onChange={setVehicleClass} placeholder="e.g. MVS_PMV" />
          <Input label="Make" value={make} onChange={setMake} placeholder="e.g. Toyota" required />
          <Input label="Model" value={model} onChange={setModel} placeholder="e.g. Demio" required />
          <Input label="Year of Manufacture" type="number" value={yearOfManufacture} onChange={setYearOfManufacture} />
          <Input label="Colour" value={color} onChange={setColor} placeholder="e.g. #ffffff or White" />
          <Select label="Fuel Type" value={fuelType} onChange={setFuelType} options={FUEL_TYPES} />
          <Input label="Engine Number" value={engineNo} onChange={setEngineNo} />
          <Input label="Engine Capacity (cc)" type="number" value={engineCapacity} onChange={setEngineCapacity} />
          <Input label="Seating Capacity" type="number" value={seatingCapacity} onChange={setSeatingCapacity} />
          <Input label="Axles" type="number" value={axles} onChange={setAxles} />
          <Input label="Tare Weight (kg)" type="number" value={tareWeight} onChange={setTareWeight} />
          <Input label="Value of Vehicle (KES)" type="number" value={valueOfVehicle} onChange={setValueOfVehicle} />
          <Input label="Chassis Number" value={chassisNo} onChange={setChassisNo} />
          <Input label="Logbook Number" value={logbookNo} onChange={setLogbookNo} />
        </Card>

        {/* Documents */}
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents</p>
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
          <Button variant="secondary" onClick={() => router.push('/temv')} className="flex-1">
            Back
          </Button>
          <Button onClick={handleNext} disabled={saving || !verified} className="flex-1">
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

export default function TEMVExportationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      }
    >
      <TEMVExportationContent />
    </Suspense>
  );
}
