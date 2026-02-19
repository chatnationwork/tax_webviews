'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  FileText, 
  Calendar, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Shield,
  FileSpreadsheet,
  MessageCircle,
  Send,
  ArrowLeft
} from 'lucide-react';
import { 
  getPayrolls, 
  exportReport, 
  sendReportToWhatsApp,
  Payroll,
} from '../../actions/payroll';
import { getStoredPhoneServer } from '@/app/actions/auth';
import { getKnownPhone, saveKnownPhone } from '@/app/_lib/session-store';


const PAYROLL_BASE_URL = 'https://kratest.pesaflow.com';

const REPORT_TYPES = [
  { value: 'p10', label: 'P10 Tax Report', description: 'Monthly PAYE tax return' },
  { value: 'fringe_benefit', label: 'Fringe Benefit Report', description: 'Employee fringe benefits' },
  { value: 'payroll_details', label: 'Payroll Details', description: 'Complete payroll breakdown' },
  { value: 'payroll_shif_report', label: 'SHIF Report', description: 'Social Health Insurance Fund' },
  { value: 'payroll_housing_levy_report', label: 'AHL Report', description: 'Affordable Housing Levy' },
  { value: 'payroll_nssf_report', label: 'NSSF Report', description: 'National Social Security Fund' },
];

const getFullDownloadUrl = (downloadUrl: string): string => {
  if (downloadUrl.startsWith('http')) return downloadUrl;
  return `${PAYROLL_BASE_URL}${downloadUrl}`;
};

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || searchParams.get('number') || '';
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

  
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPayrolls, setLoadingPayrolls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const fetchPayrolls = async () => {
    setLoadingPayrolls(true);
    setError(null);
    try {
      const result = await getPayrolls(1, 50);
      setPayrolls(result.entries);
    } catch (err: any) {
      setError(err.message || 'Failed to load payrolls');
    } finally {
      setLoadingPayrolls(false);
    }
  };

  const handleGetReport = async () => {
    if (!selectedPayroll || !selectedReportType) {
      setError('Please select a payroll period and report type');
      return;
    }
    if (!phone) {
      setError('WhatsApp number is missing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await exportReport(
        selectedReportType,
        selectedPayroll.period,
        selectedPayroll.ref_no
      );
      
      const fullDownloadUrl = getFullDownloadUrl(result.download_url);
      await sendReportToWhatsApp(fullDownloadUrl, result.password, phone);
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPayroll(null);
    setSelectedReportType('');
    setSuccess(false);
    setError(null);
  };

  const buildBackUrl = () => {
    const params = new URLSearchParams();
    if (phone) params.set('phone', phone);
    return `/payroll?${params.toString()}`;
  };

  const formatPeriod = (period: string) => {
    const date = new Date(period);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount: string, currency: string = 'KES') => {
    const num = parseFloat(amount);
    if (isNaN(num)) return 'N/A';
    return `${currency} ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Redirect to OTP if no token (only after session check)
  useEffect(() => {
    if (!checkingSession && phone) {
      // Logic without token redirect
    }
  }, [phone, router, checkingSession]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    );
  }

  // Show loading while checking auth or if missing phone
  if (!phone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md text-center">
          <MessageCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Phone Number Required</h2>
          <p className="text-sm text-gray-600">Please access this page via WhatsApp.</p>
        </div>
      </div>
    );
  }




  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[var(--kra-black)] text-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(buildBackUrl())} className="p-1.5 hover:bg-gray-800 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-medium">Download Reports</h1>
              <p className="text-xs text-gray-400">Generate and send to WhatsApp</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg">
            <MessageCircle className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs">{phone.slice(-4)}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 py-4">
        {success ? (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Report Sent!</h2>
            <p className="text-sm text-gray-600 mb-4">Check your WhatsApp for the download link.</p>
            <button
              onClick={resetForm}
              className="w-full py-3 bg-[var(--kra-red)] text-white rounded-lg text-sm font-medium"
            >
              Generate Another Report
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Select Period */}
            <div className="bg-white rounded-xl shadow-sm p-4 border-t-4 border-[var(--kra-red)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-[var(--kra-red)] text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <h2 className="text-sm font-semibold text-gray-900">Select Payroll Period</h2>
              </div>

              {loadingPayrolls ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--kra-red)]" />
                </div>
              ) : payrolls.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No payrolls found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {payrolls.map((payroll) => (
                    <button
                      key={payroll.id}
                      onClick={() => setSelectedPayroll(payroll)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedPayroll?.id === payroll.id
                          ? 'border-[var(--kra-red)] bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{formatPeriod(payroll.period)}</p>
                          <p className="text-xs text-gray-500">{payroll.ref_no} • {payroll.employee_count} employees</p>
                        </div>
                        <p className="text-sm font-semibold">{formatCurrency(payroll.total_net)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Select Report Type */}
            <div className={`bg-white rounded-xl shadow-sm p-4 border-t-4 transition-all ${
              selectedPayroll ? 'border-[var(--kra-red)]' : 'border-gray-200 opacity-50 pointer-events-none'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-[var(--kra-red)] text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <h2 className="text-sm font-semibold text-gray-900">Select Report Type</h2>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {REPORT_TYPES.map((report) => (
                  <button
                    key={report.value}
                    onClick={() => setSelectedReportType(report.value)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      selectedReportType === report.value
                        ? 'border-[var(--kra-red)] bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-medium">{report.label}</p>
                    <p className="text-xs text-gray-500">{report.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Get Report */}
            <div className={`bg-white rounded-xl shadow-sm p-4 border-t-4 transition-all ${
              selectedPayroll && selectedReportType ? 'border-[var(--kra-red)]' : 'border-gray-200 opacity-50 pointer-events-none'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-[var(--kra-red)] text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <h2 className="text-sm font-semibold text-gray-900">Get Report</h2>
              </div>

              <button
                onClick={handleGetReport}
                disabled={loading || !selectedPayroll || !selectedReportType}
                className="w-full py-3 bg-[var(--kra-red)] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Get Report
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}
