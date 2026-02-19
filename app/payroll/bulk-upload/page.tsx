'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Upload, FileSpreadsheet, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Layout, Card, Button, Input } from '../../_components/Layout';
import { payrollStore } from '../../_lib/payroll-store';
import { sendTemplateToWhatsApp, uploadBulkEmployees, submitBulkEmployees } from '../../actions/payroll';
import { getStoredPhoneServer } from '@/app/actions/auth';
import { getKnownPhone, saveKnownPhone } from '@/app/_lib/session-store';

function BulkUploadContent() {
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

  const [step, setStep] = useState<'form' | 'upload' | 'review' | 'success'>('form');
  const [formData, setFormData] = useState({
    organizationId: '',
    taxPayerId: ''
  });
  const [loading, setLoading] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [templateSent, setTemplateSent] = useState(false);
  const [parsedEmployees, setParsedEmployees] = useState<any[]>([]);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSendTemplate = async () => {
    if (!phone) {
      setError('WhatsApp phone number is missing');
      return;
    }

    setSendingTemplate(true);
    setError('');

    try {
      const result = await sendTemplateToWhatsApp(phone);
      if (result.success) {
        setTemplateSent(true);
        // Save org context
        payrollStore.setOrganizationContext({
          organizationId: formData.organizationId,
          taxPayerId: formData.taxPayerId
        });
        setStep('upload');
      } else {
        setError(result.error || 'Failed to send template');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send template');
    } finally {
      setSendingTemplate(false);
    }
  };

  const handleContinueToUpload = () => {
    if (!formData.organizationId && !formData.taxPayerId) {
      setError('Please provide either Organization ID or TaxPayer ID');
      return;
    }
    
    payrollStore.setOrganizationContext({
      organizationId: formData.organizationId,
      taxPayerId: formData.taxPayerId
    });
    setStep('upload');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('attachment', file);

      const result = await uploadBulkEmployees(
        formData.organizationId,
        formData.taxPayerId,
        formDataUpload
      );

      if (result.success) {
        setParsedEmployees(result.employees);
        setStep('review');
      } else {
        setError(result.error || 'Failed to parse file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEmployees = async () => {
    setLoading(true);
    setError('');

    try {
      // Filter out employees with errors
      const validEmployees = parsedEmployees.filter(emp => !emp.hasError);
      
      if (validEmployees.length === 0) {
        setError('No valid employees to submit');
        setLoading(false);
        return;
      }

      const result = await submitBulkEmployees(
        validEmployees,
        formData.organizationId ? 'organization' : 'individual',
        formData.organizationId || formData.taxPayerId,
        true // partial upload
      );

      if (result.success) {
        setStep('success');
      } else {
        setError(result.error || 'Failed to submit employees');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit employees');
    } finally {
      setLoading(false);
    }
  };

  const buildBackUrl = () => {
    const params = new URLSearchParams();
    if (phone) params.set('phone', phone);
    return `/payroll?${params.toString()}`;
  };

  // Redirect to OTP if no token
  useEffect(() => {
  }, [phone, router]);

  const employeesWithErrors = parsedEmployees.filter(emp => emp.hasError || emp.errors);
  const validEmployees = parsedEmployees.filter(emp => !emp.hasError && !emp.errors);

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



  return (
    <Layout 
      title="Bulk Upload Employees" 
      step={step === 'form' ? 'Step 1: Organization Details' : step === 'upload' ? 'Step 2: Upload File' : step === 'review' ? 'Step 3: Review' : 'Complete'}
      onBack={() => step === 'form' ? router.push(buildBackUrl()) : setStep(step === 'review' ? 'upload' : 'form')}
    >
      <div className="space-y-4">
        {/* Step 1: Organization Details */}
        {step === 'form' && (
          <>
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Organization Details</h2>
                  <p className="text-xs text-gray-500">Enter your organization information</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="space-y-4">
                <Input
                  label="Organisation ID"
                  value={formData.organizationId}
                  onChange={(value) => handleChange('organizationId', value)}
                  placeholder="e.g., 12345"
                />

                <Input
                  label="TaxPayer ID"
                  value={formData.taxPayerId}
                  onChange={(value) => handleChange('taxPayerId', value)}
                  placeholder="e.g., 21128"
                />

                <p className="text-xs text-gray-500">
                  Provide either Organisation ID (for organizations) or TaxPayer ID (for individuals).
                </p>
              </div>
            </Card>

            <div className="space-y-2">
              <Button onClick={handleSendTemplate} disabled={sendingTemplate}>
                {sendingTemplate ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Sending Template...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 inline mr-2" />
                    Get Template via WhatsApp
                  </>
                )}
              </Button>

              <Button variant="secondary" onClick={handleContinueToUpload}>
                I already have the template
              </Button>
            </div>

            {templateSent && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-xs text-green-700">Template sent to your WhatsApp!</p>
              </div>
            )}
          </>
        )}

        {/* Step 2: Upload File */}
        {step === 'upload' && (
          <>
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Upload Employee File</h2>
                  <p className="text-xs text-gray-500">Upload your completed Excel file</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-center py-6">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-4">
                  Upload the completed Employee Upload Template
                </p>
                
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={loading}
                />
                <label
                  htmlFor="file-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-[var(--kra-red)] text-white rounded-lg cursor-pointer hover:bg-[var(--kra-red-dark)] transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Choose File
                    </>
                  )}
                </label>
              </div>
            </Card>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> File must be in Excel format (.xlsx or .xls). Max size: 10MB
              </p>
            </div>
          </>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <>
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Review Employees</h2>
                  <p className="text-xs text-gray-500">{parsedEmployees.length} employees found</p>
                </div>
              </div>
            </Card>

            {/* Summary */}
            <Card>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{validEmployees.length}</p>
                  <p className="text-xs text-green-700">Valid</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{employeesWithErrors.length}</p>
                  <p className="text-xs text-red-700">With Errors</p>
                </div>
              </div>
            </Card>

            {/* Employees List */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Employee List</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {parsedEmployees.slice(0, 10).map((emp, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2 rounded-lg border ${emp.hasError || emp.errors ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{emp.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{emp.pin}</p>
                      </div>
                      {(emp.hasError || emp.errors) && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    {emp.errors && (
                      <div className="mt-1">
                        {Object.entries(emp.errors).map(([key, value]) => (
                          <p key={key} className="text-xs text-red-600">{key}: {String(value)}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {parsedEmployees.length > 10 && (
                  <p className="text-xs text-gray-500 text-center">... and {parsedEmployees.length - 10} more</p>
                )}
              </div>
            </Card>

            <Button onClick={handleSubmitEmployees} disabled={loading || validEmployees.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Submitting...
                </>
              ) : (
                `Submit ${validEmployees.length} Employees`
              )}
            </Button>
          </>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Employees Uploaded Successfully!</h2>
            <p className="text-gray-600 mb-6">
              {validEmployees.length} employees have been added to your payroll.
            </p>
            <Button onClick={() => router.push(buildBackUrl())}>
              Back to Payroll Services
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function BulkUploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    }>
      <BulkUploadContent />
    </Suspense>
  );
}
