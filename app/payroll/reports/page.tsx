"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Calendar, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Shield,
  FileSpreadsheet,
  MessageCircle,
  Send
} from 'lucide-react';
import { 
  getPayrolls, 
  exportReport, 
  sendReportToWhatsApp,
  Payroll,
  ExportReportResult
} from '../../actions/payroll-reports';

// Base URL for downloads
const PAYROLL_BASE_URL = 'https://kratest.pesaflow.com';

// Available report types
const REPORT_TYPES = [
  { value: 'p10', label: 'P10 Tax Report', description: 'Monthly PAYE tax return' },
  { value: 'fringe_benefit', label: 'Fringe Benefit Report', description: 'Employee fringe benefits' },
  { value: 'payroll_details', label: 'Payroll Details (Muster Roll)', description: 'Complete payroll breakdown' },
  { value: 'payroll_shif_report', label: 'SHIF Report', description: 'Social Health Insurance Fund' },
  { value: 'payroll_housing_levy_report', label: 'AHL Report', description: 'Affordable Housing Levy' },
  { value: 'payroll_nssf_report', label: 'NSSF Report', description: 'National Social Security Fund' },
];

// Helper to construct full download URL
const getFullDownloadUrl = (downloadUrl: string): string => {
  if (downloadUrl.startsWith('http')) {
    return downloadUrl;
  }
  return `${PAYROLL_BASE_URL}${downloadUrl}`;
};

// Format WhatsApp number for display
const formatWhatsAppNumber = (number: string): string => {
  if (number.startsWith('254')) {
    return `+${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }
  return number;
};

// Reports Page Content Component
function ReportsPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const whatsappNumber = searchParams.get('number') || searchParams.get('whatsapp') || '';
  
  // State
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPayrolls, setLoadingPayrolls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  
  // Result state
  const [success, setSuccess] = useState(false);

  // Fetch payrolls on mount
  useEffect(() => {
    if (token) {
      fetchPayrolls();
    }
  }, [token]);

  const fetchPayrolls = async () => {
    setLoadingPayrolls(true);
    setError(null);
    try {
      const result = await getPayrolls(token, 1, 50);
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

    if (!whatsappNumber) {
      setError('WhatsApp number is missing. Please check your URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Step 1: Generate the report
      const result = await exportReport(
        token,
        selectedReportType,
        selectedPayroll.period,
        selectedPayroll.ref_no
      );
      
      // Step 2: Send to WhatsApp
      const fullDownloadUrl = getFullDownloadUrl(result.download_url);
      await sendReportToWhatsApp(fullDownloadUrl, result.password, whatsappNumber);
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate or send report');
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

  const formatPeriod = (period: string) => {
    const date = new Date(period);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount: string, currency: string = 'KES') => {
    const num = parseFloat(amount);
    if (isNaN(num)) return 'N/A';
    return `${currency} ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Show error if token is missing
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md text-center border border-red-100">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Authorization Required</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            A valid authorization token is required to access reports.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-left">
            <p className="text-xs sm:text-sm text-gray-500 mb-2">Expected URL format:</p>
            <code className="text-xs text-indigo-600 break-all">
              /payroll/reports?token=YOUR_TOKEN&number=254XXXXXXXXX
            </code>
          </div>
        </div>
      </div>
    );
  }

  // Show warning if WhatsApp number is missing
  if (!whatsappNumber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md text-center border border-amber-100">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">WhatsApp Number Required</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            A WhatsApp number is required to receive reports.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-left">
            <p className="text-xs sm:text-sm text-gray-500 mb-2">Expected URL format:</p>
            <code className="text-xs text-indigo-600 break-all">
              /payroll/reports?token=YOUR_TOKEN&number=254XXXXXXXXX
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-[#CC0000] shadow-lg sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#CC0000] flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-[#CC0000]" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">Payroll Reports</h1>
              <p className="text-xs sm:text-sm text-white/70 hidden sm:block">Generate and send reports to WhatsApp</p>
            </div>
            {/* WhatsApp Number Badge */}
            <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-white/10 border border-white/30 rounded-lg">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#CC0000]" />
              <span className="text-xs sm:text-sm font-medium text-white hidden sm:inline">{formatWhatsAppNumber(whatsappNumber)}</span>
              <span className="text-xs font-medium text-white sm:hidden">{whatsappNumber.slice(-4)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        
        {/* Success State */}
        {success && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-green-200 mb-4">
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Report Sent!</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                Your report has been sent to your WhatsApp
              </p>
              <div className="bg-green-50 rounded-lg p-3 sm:p-4 mb-4">
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">{formatWhatsAppNumber(whatsappNumber)}</span>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Check your WhatsApp for the download link and password
                </p>
              </div>
              <button
                onClick={resetForm}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#CC0000] text-white rounded-lg hover:bg-[#990000] transition-colors text-sm font-medium"
              >
                Generate Another Report
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form - Only show when not in success state */}
        {!success && (
          <div className="space-y-4">
            {/* Step 1: Select Period */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 border-t-4 border-[#CC0000]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#CC0000] text-white flex items-center justify-center text-xs font-bold">1</div>
                <h2 className="text-sm sm:text-base font-semibold text-[#CC0000]">Select Payroll Period</h2>
              </div>

              {loadingPayrolls ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#CC0000]" />
                  <span className="ml-2 text-sm text-gray-600">Loading payrolls...</span>
                </div>
              ) : payrolls.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No payrolls found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {payrolls.map((payroll) => (
                    <button
                      key={payroll.id}
                      onClick={() => setSelectedPayroll(payroll)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedPayroll?.id === payroll.id
                          ? 'border-[#CC0000] bg-[#CC0000]/10'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatPeriod(payroll.period)}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{payroll.ref_no} • {payroll.employee_count} employees</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(payroll.total_net, payroll.currency)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            payroll.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {payroll.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Select Report Type */}
            <div className={`bg-white rounded-xl shadow-lg p-4 sm:p-5 border-t-4 transition-all ${
              selectedPayroll ? 'border-[#CC0000] opacity-100' : 'border-gray-200 opacity-50 pointer-events-none'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#CC0000] text-white flex items-center justify-center text-xs font-bold">2</div>
                <h2 className="text-sm sm:text-base font-semibold text-[#CC0000]">Select Report Type</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REPORT_TYPES.map((report) => (
                  <button
                    key={report.value}
                    onClick={() => setSelectedReportType(report.value)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      selectedReportType === report.value
                        ? 'border-[#CC0000] bg-[#CC0000]/10'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        selectedReportType === report.value ? 'text-[#CC0000]' : 'text-gray-400'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{report.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Get Report */}
            <div className={`bg-white rounded-xl shadow-lg p-4 sm:p-5 border-t-4 transition-all ${
              selectedPayroll && selectedReportType ? 'border-[#CC0000] opacity-100' : 'border-gray-200 opacity-50 pointer-events-none'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#CC0000] text-white flex items-center justify-center text-xs font-bold">3</div>
                <h2 className="text-sm sm:text-base font-semibold text-[#CC0000]">Get Report</h2>
              </div>

              {/* Summary */}
              {selectedPayroll && selectedReportType && (
                <div className="bg-[#F5F5F5] rounded-lg p-3 mb-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Period:</span>
                    <span className="font-medium text-gray-900">{formatPeriod(selectedPayroll.period)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-600">Report:</span>
                    <span className="font-medium text-gray-900">
                      {REPORT_TYPES.find(r => r.value === selectedReportType)?.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-600">Send to:</span>
                    <span className="font-medium text-[#008751] flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {formatWhatsAppNumber(whatsappNumber)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleGetReport}
                disabled={loading || !selectedPayroll || !selectedReportType}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#CC0000] text-white rounded-lg hover:bg-[#990000] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating & Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Get Report</span>
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Report will be generated and sent to your WhatsApp with a download link and password
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Main Page Component with Suspense wrapper
export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <span className="text-gray-600 font-medium">Loading...</span>
        </div>
      </div>
    }>
      <ReportsPageContent />
    </Suspense>
  );
}
