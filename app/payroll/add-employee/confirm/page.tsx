'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, User, Briefcase, DollarSign, AlertCircle, Shield } from 'lucide-react';
import { Layout, Card, Button } from '../../../_components/Layout';
import { validateEmployeeDetails, addEmployee } from '../../../actions/payroll';
import { payrollStore } from '../../../_lib/payroll-store';
import { getStoredPhoneServer } from '@/app/actions/auth';
import { getKnownPhone, saveKnownPhone } from '@/app/_lib/session-store';
function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const [checkingSession, setCheckingSession] = useState(true);

  // Check session on mount
  useEffect(() => {
    const performSessionCheck = async () => {
      try {
        let currentPhone = phone;
        
        if (!currentPhone) {
          try {
            const localPhone = getKnownPhone();
            if (localPhone) currentPhone = localPhone;
          } catch (e) {
            console.error('Error accessing localStorage', e);
          }
        }
        
        if (!currentPhone) {
          const storedPhone = await getStoredPhoneServer();
          if (storedPhone) currentPhone = storedPhone;
        }
        
        if (currentPhone) {
          if (currentPhone !== phone) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('phone', currentPhone);
            router.replace(`${window.location.pathname}?${params.toString()}`);
          }
          saveKnownPhone(currentPhone);
        }
        
        setCheckingSession(false);
      } catch (err) {
        console.error('Phone check failed', err);
        setCheckingSession(false);
      }
    };
    
    performSessionCheck();
  }, [phone, router, searchParams]);

  // Redirect to OTP if no token (only after session check)
  useEffect(() => {
    if (!checkingSession && phone) {
      // Logic without token redirect
    }
  }, [phone, router, checkingSession]);

  const [employeeData, setEmployeeData] = useState(payrollStore.getEmployeeData());
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  const [error, setError] = useState('');

  // Check if we have all required data
  useEffect(() => {
    const data = payrollStore.getEmployeeData();
    setEmployeeData(data);
    
    if (!data.idNumber || !data.kraPin || !data.employerTaxPayerId) {
      // Redirect back to personal info
      const params = new URLSearchParams();
      if (phone) params.set('phone', phone);
      router.push(`/payroll/add-employee/personal?${params.toString()}`);
    }
  }, [phone, router]);

  const handleValidate = async () => {
    setValidating(true);
    setError('');

    try {
      const result = await validateEmployeeDetails(
        employeeData.employerKraPin,
        employeeData.idNumber,
        employeeData.kraPin,
        employeeData.firstName,
        employeeData.employerTaxPayerId,
        employeeData.nationality
      );

      if (result.success && result.data) {
        setValidationData(result.data);
        setValidated(true);
        // Update store with validation data
        payrollStore.setEmployeeData({
          fullName: result.data.name,
          dob: result.data.dob,
          gender: result.data.gender,
          nssfNo: result.data.nssf_no,
          shifNo: result.data.shif_no
        });
      } else {
        setError(result.error || 'Validation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!validated) {
      setError('Please validate employee details first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = payrollStore.getEmployeeData();
      
      const result = await addEmployee({
        name: validationData?.name || `${data.firstName}`,
        pin: data.kraPin,
        nssf_no: validationData?.nssf_no || data.nssfNo,
        shif_no: validationData?.shif_no || data.shifNo,
        msisdn: phone,
        type: data.nationality,
        primary_employee: true,
        contract_type: data.employmentType,
        date_of_employment: data.startDate,
        salary: data.basicSalary,
        employer_tax_payer_id: data.employerTaxPayerId,
        dob: validationData?.dob || data.dob,
        gui: data.idNumber
      });

      if (result.success) {
        // Navigate to success
        const params = new URLSearchParams();
        if (phone) params.set('phone', phone);
        params.set('name', validationData?.name || data.firstName);
        router.push(`/payroll/add-employee/success?${params.toString()}`);
      } else {
        setError(result.error || 'Failed to add employee');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  const buildBackUrl = () => {
    const params = new URLSearchParams();
    if (phone) params.set('phone', phone);
    return `/payroll/add-employee/employment?${params.toString()}`;
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Phone Number Required</h2>
          <p className="text-sm text-gray-600">Please access this page via WhatsApp.</p>
        </div>
      </div>
    );
  }



  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900">{value}</span>
    </div>
  );

  return (
    <Layout 
      title="Add New Employee" 
      step="Step 3 of 3: Confirm Details"
      onBack={() => router.push(buildBackUrl())}
    >
      <div className="space-y-4">
        {/* Personal Info Summary */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
          </div>
          <div className="space-y-1">
            <InfoRow label="Nationality" value={employeeData.nationality === 'citizen' ? 'Kenyan Citizen' : employeeData.nationality === 'resident' ? 'Resident' : 'Non-Resident'} />
            <InfoRow label="ID/Passport" value={employeeData.idNumber} />
            <InfoRow label="KRA PIN" value={employeeData.kraPin} />
            <InfoRow label="First Name" value={employeeData.firstName} />
            {validated && validationData && (
              <>
                <InfoRow label="Full Name" value={validationData.name} />
                <InfoRow label="Date of Birth" value={validationData.dob} />
                <InfoRow label="Gender" value={validationData.gender === 'M' ? 'Male' : 'Female'} />
              </>
            )}
          </div>
        </Card>

        {/* Employment Info Summary */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">Employment Details</h3>
          </div>
          <div className="space-y-1">
            <InfoRow label="Employer TaxPayer ID" value={employeeData.employerTaxPayerId} />
            <InfoRow label="Employer KRA PIN" value={employeeData.employerKraPin} />
            <InfoRow label="Employment Type" value={employeeData.employmentType} />
            <InfoRow label="Start Date" value={employeeData.startDate} />
          </div>
        </Card>

        {/* Salary Info Summary */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-900">Salary Details</h3>
          </div>
          <div className="space-y-1">
            <InfoRow label="Basic Salary" value={formatCurrency(employeeData.basicSalary)} />
            <InfoRow label="Has Benefits" value={employeeData.hasBenefits ? 'Yes' : 'No'} />
          </div>
        </Card>

        {/* Validation Status */}
        {validated && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-xs text-green-700 font-medium">Employee details validated successfully</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!validated ? (
            <Button onClick={handleValidate} disabled={validating}>
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Validating...
                </>
              ) : (
                'Validate Employee'
              )}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Adding Employee...
                </>
              ) : (
                'Add Employee'
              )}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
