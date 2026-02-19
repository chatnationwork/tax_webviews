'use server';

import axios from 'axios';
import { cookies } from 'next/headers';

const BASE_URL = process.env.API_URL;
const WEBHOOK_URL = 'https://webhook.chatnation.co.ke/webhook/6937dc3730946fd02503d6e9';

// ============= Error Handler =============

const handleApiError = (error: any) => {
  console.error('API Error:', error.response?.data || error.message);
  throw new Error(
    error.response?.data?.message || 
    error.response?.data?.error || 
    'An error occurred while communicating with the server'
  );
};

// ============= Helper to get token =============
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get('etims_auth_token')?.value || cookieStore.get('auth_token')?.value;
  if (!token) {
    throw new Error('Authorization token is required');
  }
  return token;
}

// ============= OTP & Session Types =============

export interface GenerateOTPResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VerifyOTPResult {
  success: boolean;
  message?: string;
  error?: string;
  token?: string;
}

// ============= Employee Types =============

export interface Employee {
  id: number;
  uuid: string;
  name: string;
  pin: string;
  email: string | null;
  msisdn: string;
  gender: string | null;
  dob: string;
  status: string;
  contract_type: string;
  date_of_employment: string;
  date_of_completion: string | null;
  employment_no: string;
  department: string | null;
  profession: string | null;
  gross_pay: string;
  net_pay: string;
  salary: string;
  taxable_pay: string;
  tax_due: string;
  deduction: string;
  allowance: string;
  benefit: string;
  relief: string;
  currency: string;
  nssf_no: string;
  shif_no: string;
  employer_type: string;
  employer_tax_payer: any;
  tax_payer: any;
  items: any[];
  inserted_at: string;
  updated_at: string;
}

export interface SearchEmployeesResult {
  entries: Employee[];
  page_number: number;
  page_size: number;
  total_entries: number;
  total_pages: number;
}

export interface ValidateEmployeeResult {
  success: boolean;
  data?: {
    dob: string;
    gender: string;
    gui: string;
    name: string;
    pin: string;
    type: string;
    nssf_no?: string;
    shif_no?: string;
  };
  error?: string;
}

export interface AddEmployeeResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface BulkUploadParseResult {
  success: boolean;
  employees: any[];
  error?: string;
}

export interface BulkSubmitResult {
  success: boolean;
  message: string;
  error?: string;
}

// ============= Payroll Types =============

export interface Payroll {
  id: number;
  uuid: string;
  ref_no: string;
  period: string;
  status: string;
  employer_tax_payer: {
    name: string;
    pin: string;
  };
  total_gross: string;
  total_net: string;
  total_tax: string;
  total_deductions: string;
  employee_count: number;
  currency: string;
  inserted_at: string;
  updated_at: string;
}

export interface PayrollListResult {
  entries: Payroll[];
  page_number: number;
  page_size: number;
  total_entries: number;
  total_pages: number;
}

export interface ProcessPayrollResult {
  success: boolean;
  refNo?: string;
  message: string;
  error?: string;
}

export interface PayrollPeriod {
  period: string;
  label: string;
}

export interface GetPeriodsResult {
  success: boolean;
  periods: PayrollPeriod[];
  error?: string;
}

export interface ExportReportResult {
  download_url: string;
  password: string;
  template: string;
  error?: string;
}

// ============= Employee Management =============

/**
 * Search for employees by name or KRA PIN
 */
export async function searchEmployees(
  searchQuery: string,
  page: number = 1,
  pageSize: number = 5
): Promise<SearchEmployeesResult> {
  const token = await getAuthToken();

  try {
    const response = await axios.get(`${BASE_URL}/payroll/employee`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { page, page_size: pageSize, multi_filter: searchQuery }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * Validate employee details before adding
 */
export async function validateEmployeeDetails(
  employerPin: string,
  employeeIdNumber: string,
  employeeKraPin: string,
  firstName: string,
  employerTaxPayerId: string,
  employeeType: 'citizen' | 'resident' | 'non-resident' = 'citizen'
): Promise<ValidateEmployeeResult> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/employee/personal-details/validate`,
      {
        pin: employerPin,
        gui: employeeIdNumber,
        type: employeeType,
        first_name: firstName,
        employer_tax_payer_id: employerTaxPayerId,
        tax_payer_pin: employeeKraPin
      },
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message
    };
  }
}

/**
 * Add a single employee to the payroll system
 */
export async function addEmployee(
  employeeData: {
    name: string;
    pin: string;
    nssf_no?: string;
    shif_no?: string;
    msisdn: string;
    type: 'citizen' | 'resident' | 'non-resident';
    primary_employee: boolean;
    contract_type: string;
    date_of_employment: string;
    date_of_completion?: string;
    salary: number;
    employer_tax_payer_id: string;
    dob?: string;
    gui?: string;
    income?: any[];
    benefits?: any[];
  }
): Promise<AddEmployeeResult> {
  const token = await getAuthToken();

  try {
    const income = employeeData.income || [
      { type: 'salary', subtype: 'basic-salary', amount: employeeData.salary }
    ];

    const payload = {
      name: employeeData.name,
      pin: employeeData.pin,
      nssf_no: employeeData.nssf_no || '',
      shif_no: employeeData.shif_no || '',
      msisdn: employeeData.msisdn,
      type: employeeData.type,
      primary_employee: employeeData.primary_employee ? 'yes' : 'no',
      contract_type: employeeData.contract_type,
      date_of_employment: employeeData.date_of_employment,
      date_of_completion: employeeData.date_of_completion || '2026-01-01',
      salary: employeeData.salary,
      employer_tax_payer_id: employeeData.employer_tax_payer_id,
      dob: employeeData.dob,
      gui: employeeData.gui,
      income,
      benefits: employeeData.benefits || []
    };

    const response = await axios.post(
      `${BASE_URL}/payroll/employee`,
      payload,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    
    return { success: true, message: response.data?.message || 'Employee added successfully' };
  } catch (error: any) {
    handleApiError(error);
    return { success: false, message: 'Failed to add employee', error: error.message };
  }
}

/**
 * Update employee details
 */
export async function updateEmployee(
  employeeUuid: string,
  updates: Record<string, any>
): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/employee/${employeeUuid}/update`,
      updates,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * Deactivate employee (toggle status to inactive)
 */
export async function deactivateEmployee(
  employeeUuid: string,
  deactivationReason: string
): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/employee/${employeeUuid}/toggle-status`,
      { status: false, deactivation_reason: deactivationReason },
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * Terminate employee
 */
export async function terminateEmployee(
  employeeUuid: string,
  terminationReason: string,
  terminationDate: string
): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/employee/${employeeUuid}/remove`,
      { termination_reason: terminationReason, termination_date: terminationDate },
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * Reinstate a previously terminated employee
 */
export async function reinstateEmployee(
  employeeUuid: string,
  newEmploymentNo: string
): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/employee/${employeeUuid}/reinstate`,
      { new_employment_no: newEmploymentNo },
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

// ============= Bulk Upload =============

/**
 * Get the employee upload template URL
 */
export async function getEmployeeTemplateUrl(): Promise<string> {
  return `${BASE_URL}/payroll/employee/view-template/Employee%20Upload%20Template.xlsx`;
}

/**
 * Send the employee template to WhatsApp
 */
export async function sendTemplateToWhatsApp(
  whatsappNumber: string
): Promise<{ success: boolean; error?: string }> {
  const templateUrl = await getEmployeeTemplateUrl();
  
  try {
    await axios.get(WEBHOOK_URL, {
      params: {
        download_url: templateUrl,
        password: '',
        number: whatsappNumber,
        message: 'Here is the Employee Upload Template. Fill it out and upload it back.'
      }
    });
    return { success: true };
  } catch (error: any) {
    console.error('Webhook error:', error);
    return { success: false, error: 'Failed to send template to WhatsApp' };
  }
}

/**
 * Upload and parse bulk employees file
 */
export async function uploadBulkEmployees(
  organizationId: string,
  employerTaxPayerId: string,
  fileData: FormData
): Promise<BulkUploadParseResult> {
  const token = await getAuthToken();

  try {
    const params: any = { type: 'employees' };
    if (organizationId) params.organization_id = organizationId;
    if (employerTaxPayerId) params.employer_tax_payer_id = employerTaxPayerId;

    const response = await axios.post(
      `${BASE_URL}/payroll/employee/upload-employees`,
      fileData,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }, params }
    );
    
    return { success: true, employees: response.data };
  } catch (error: any) {
    handleApiError(error);
    return { success: false, employees: [], error: error.message };
  }
}

/**
 * Submit parsed bulk employees
 */
export async function submitBulkEmployees(
  employees: any[],
  employerType: 'organization' | 'individual',
  employerTaxPayerId: string,
  partial: boolean = true
): Promise<BulkSubmitResult> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/employee`,
      { employees, employer_type: employerType, employer_tax_payer_id: employerTaxPayerId },
      {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        params: { partial: partial ? 'true' : 'false' }
      }
    );
    
    return { success: true, message: response.data?.message || 'Employees uploaded successfully' };
  } catch (error: any) {
    handleApiError(error);
    return { success: false, message: 'Failed to submit employees', error: error.message };
  }
}

// ============= Payroll Processing =============

/**
 * Process regular payroll for a period
 */
export async function processRegularPayroll(
  period: string,
  employerTaxPayerId: string,
  contractTypes: string[]
): Promise<ProcessPayrollResult> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll`,
      {
        period,
        employer_tax_payer_id: employerTaxPayerId,
        contract_type: contractTypes,
        payroll_type: 'regular'
      },
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    
    return { success: true, refNo: response.data?.ref_no, message: 'Payroll processed successfully' };
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    return { success: false, message: errorMessage, error: errorMessage };
  }
}

/**
 * Get available payroll periods
 */
export async function getPayrollPeriods(
  employerTaxPayerId?: string,
  organizationId?: string
): Promise<GetPeriodsResult> {
  const token = await getAuthToken();

  try {
    const params: any = {};
    if (employerTaxPayerId) params.employer_tax_payer_id = employerTaxPayerId;
    if (organizationId) params.organization_id = organizationId;

    const response = await axios.get(`${BASE_URL}/payroll/get-periods`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params
    });
    
    const periods: PayrollPeriod[] = (response.data || []).map((p: string) => ({
      period: p,
      label: new Date(p).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    }));
    
    return { success: true, periods };
  } catch (error: any) {
    return { success: false, periods: [], error: error.response?.data?.message || error.message };
  }
}

/**
 * Get payroll system constants
 */
export async function getPayrollConstants(): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = await getAuthToken();

  try {
    const response = await axios.get(`${BASE_URL}/payroll/get-constants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

// ============= Reports =============

/**
 * Get payrolls by period
 */
export async function getPayrollsByPeriod(
  period: string,
  page: number = 1,
  pageSize: number = 10
): Promise<PayrollListResult> {
  const token = await getAuthToken();

  try {
    const response = await axios.get(`${BASE_URL}/payroll`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { period, page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * Get all payrolls (for period selection)
 */
export async function getPayrolls(
  page: number = 1,
  pageSize: number = 20
): Promise<PayrollListResult> {
  const token = await getAuthToken();

  try {
    const response = await axios.get(`${BASE_URL}/payroll`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * Export/Generate a report
 */
export async function exportReport(
  reportType: string,
  period: string,
  payrollRefNo: string
): Promise<ExportReportResult> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/export-reports`,
      { report_type: reportType, period, payroll_ref_no: payrollRefNo },
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * Send report to WhatsApp via webhook
 */
export async function sendReportToWhatsApp(
  downloadUrl: string,
  password: string,
  whatsappNumber: string
): Promise<{ success: boolean }> {
  try {
    await axios.get(WEBHOOK_URL, {
      params: { download_url: downloadUrl, password, number: whatsappNumber }
    });
    return { success: true };
  } catch (error) {
    console.error('Webhook error:', error);
    throw new Error('Failed to send report to WhatsApp');
  }
}