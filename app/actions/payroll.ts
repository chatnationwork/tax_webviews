'use server';

/**
 * Payroll HTTP integration — request paths, methods, and JSON bodies must match `payroll.json`
 * (Postman collection "Payroll API Docs v1"). Do not invent fields or defaults not present there.
 * Undocumented: response shapes (e.g. GET /payroll/get-periods body) are handled defensively only.
 *
 * Coverage map (payroll.json folder → exported function):
 * - Employee Management: validateEmployeeDetails (Validate Employee Details — GET), addEmployee & submitBulkEmployees (Add Single Employee — same POST /payroll/employee wrapper; app uses employer_type individual and empty string organization_id when unset), uploadBulkEmployees (Add Bulk Employees upload-employees form field `attachment`), getEmployeeTemplateUrl (Download Template), updateEmployee (Edit Employee), deactivateEmployee / activateEmployee (Deactivate / Activate), terminateEmployee (Terminate), reinstateEmployee (Reinstate), searchEmployees (List All Employees), getEmployeeByUuid (Get Single Employee)
 * - Payroll Processing: processRegularPayroll (Process Regular Payroll), getPayrollByRefNo & getPayrolls* (List / Get Single Payroll), updatePayrollRecord (Update Payroll), getPayrollStatistics (Payroll Statistics), getPayrollPeriods (Get Available Periods), getPayrollConstants (Get System Constants)
 * - Reports: getEmployeePayslipDownloadUrl (Download Payslip), sendPayrollPayslips (Send Payslips), sendSinglePayslip (Send Single Payslip)
 * - Filing: filePayeReturn (File PAYE), updatePayeToken (Update PAYE Token)
 * - Payment: makePayrollPayment (Generate Payment)
 * - Tax Reports + Payroll Reports + download: exportReport (Export * posts to /payroll/export-reports), getStaticReportFileUrl (Download Report File), resolveFullReportDownloadUrl (helper)
 * Not in payroll.json collection: lookupById (POST …/ussd/id-lookup on API host — identity check). sendReportToWhatsApp uses internal webhook, not the collection.
 */

import logger from '@/lib/logger';

import axios from 'axios';
import { cookies } from 'next/headers';
import { cleanPhoneNumber } from '../_lib/utils';
import { guiLookup, LookupByIdResult } from './nil-mri-tot';
import { sendWhatsAppDocument } from './auth';

const BASE_URL = process.env.API_URL;
const WEBHOOK_URL = 'https://webhook.chatnation.co.ke/webhook/6937dc3730946fd02503d6e9';

/** Best-effort message from payroll API error bodies (string, message, errors.detail, etc.) */
function messageFromPayrollErrorData(data: unknown): string {
  if (data == null) return '';
  if (typeof data === 'string') return data.trim();
  if (typeof data !== 'object') return String(data);
  const o = data as Record<string, unknown>;
  if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
  if (typeof o.error === 'string' && o.error.trim()) return o.error.trim();
  if (o.errors && typeof o.errors === 'object') {
    const e = o.errors as Record<string, unknown>;
    if (typeof e.detail === 'string' && e.detail.trim()) return e.detail.trim();
    if (Array.isArray(e.detail)) {
      return e.detail
        .map((x) =>
          typeof x === 'object' && x !== null && 'msg' in x
            ? String((x as { msg: unknown }).msg).trim()
            : String(x).trim()
        )
        .filter(Boolean)
        .join('; ');
    }
  }
  if (typeof o.detail === 'string' && o.detail.trim()) return o.detail.trim();
  return '';
}

// ============= Error Handler =============

const handleApiError = (error: any) => {
  logger.error('API Error:', error.response?.data || error.message);
  const fromBody = messageFromPayrollErrorData(error.response?.data);
  throw new Error(
    fromBody ||
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



/**
 * Lookup user details by ID number — path not listed under `payroll/` in payroll.json (uses `/ussd/id-lookup` on API_URL host).
 */
export async function lookupById(idNumber: string, given_pin:string,name:string,phoneNumber:string): Promise<LookupByIdResult> {
  if (!idNumber || idNumber.trim().length < 6) {
    return { success: false, error: 'ID number must be at least 6 characters' };
  }
  if (!given_pin) {
    return { success: false, error: 'Pin number is required' };
  }
  if (!name) {
    return { success: false, error: 'Name is required' };
  }

  // Clean phone number
  const cleanNumber = cleanPhoneNumber(phoneNumber);

  logger.info('Looking up ID:', idNumber, 'Phone:', cleanNumber);
 const token = await getAuthToken();
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    const response = await axios.post(
      `${BASE_URL}/ussd/id-lookup`,
      { 
        id_number: idNumber.trim(),
        msisdn: cleanNumber
      },
      { 
        headers, 
        timeout: 30000 
      }
    );

    logger.info('ID lookup response:', JSON.stringify(response.data, null, 2));

    // Check if we got a valid response with data
    if (response.data && response.data.name && response.data.yob) {
      
      // Validate name
  const returnedName = response.data.name
      const firstName=returnedName.split(' ')[0];

      if (name && (firstName.toLowerCase() !== name.toLowerCase())) {
        return {
          success: false,
          error: `Some of your information didnt match. Please check your details and try again`
        };
      }

      let pin = response.data.pin;
      
      // FALLBACK: If PIN is missing, try GUI lookup
      if (!pin) {
        logger.info('PIN missing in primary lookup, attempting GUI lookup fallback...');
        const guiResult = await guiLookup(idNumber.trim());
        if (guiResult.success && guiResult.pin) {
           pin = guiResult.pin;
           logger.info('PIN retrieved via GUI lookup');
        } else {
           logger.warn('GUI lookup fallback failed:', guiResult.error);
        }
      }

      if (pin !== given_pin) {
        return {
          success: false,
          error: `Some of your information didnt match. Please check your details and try again`
        };
      }

      return {
        success: true,
        idNumber: response.data.id_number || idNumber.trim(),
        name: response.data.name,
        pin: pin,
      };
    } else {
      return { 
        success: false, 
        error: response.data.message || 'ID lookup failed or invalid response' 
      };
    }
  } catch (error: any) {
    logger.error('ID lookup error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'ID lookup failed' };
  }
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
 * Validate employee details before adding — GET `/payroll/employee/personal-details/validate` (query params match payroll.json).
 * Both `pin` and `tax_payer_pin` must be the employee's KRA PIN (per API).
 * `employer_tax_payer_id` must be the numeric employer taxpayer ID (see collection example `21128`), not the employer KRA PIN.
 */
export async function validateEmployeeDetails(
  employeeIdNumber: string,
  employeeKraPin: string,
  firstName: string,
  employerTaxPayerId: string,
  employeeType: 'citizen' | 'resident' | 'non-resident' = 'citizen'
): Promise<ValidateEmployeeResult> {
  const employerId = employerTaxPayerId.trim();
  if (!employerId) {
    return { success: false, error: 'Employer Tax Payer ID is required.' };
  }
  if (!/^\d+$/.test(employerId)) {
    return {
      success: false,
      error:
        'Employer Tax Payer ID must be numeric (e.g. 11690252). Do not use the employer KRA PIN here — use the Employer KRA PIN field for A00… style PINs.'
    };
  }

  const token = await getAuthToken();

  const payload = {
    pin: employeeKraPin,
    gui: employeeIdNumber,
    type: employeeType,
    first_name: firstName,
    employer_tax_payer_id: employerId,
    tax_payer_pin: employeeKraPin
  };

  logger.info('Validating employee details:', payload);

  logger.info('Token:', token);
  logger.info('URL:', `${BASE_URL}/payroll/employee/personal-details/validate`);

  try {
    const response = await axios.get(`${BASE_URL}/payroll/employee/personal-details/validate`, {
      headers: { Authorization: `Bearer ${token}` },
      params: payload
    });

    logger.info('Response:', response.data);
    
    return { success: true, data: response.data };
  } catch (error: any) {
    const body = error.response?.data;
    logger.error('Error:', body || error.message);
    const detail =
      typeof body?.message === 'string'
        ? body.message
        : typeof body?.error === 'string'
          ? body.error
          : typeof body?.errors?.detail === 'string'
            ? body.errors.detail
            : Array.isArray(body?.errors?.detail)
              ? body.errors.detail
                  .map((x: unknown) =>
                    typeof x === 'object' && x !== null && 'msg' in x
                      ? String((x as { msg: unknown }).msg)
                      : String(x)
                  )
                  .join('; ')
              : typeof body?.detail === 'string'
                ? body.detail
                : '';
    const base = (detail || 'Validation request failed').trim();
    const hint =
      /^bad request$/i.test(base) || base.length === 0
        ? ' Confirm employer_tax_payer_id is the numeric organisation taxpayer ID (e.g. 11690252), not the employer KRA PIN; pin and tax_payer_pin are the employee KRA PIN.'
        : '';
    return {
      success: false,
      error: base + hint
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
    /** payroll.json employee row includes date_of_completion (use '' if unknown) */
    date_of_completion?: string;
    salary: number;
    employer_tax_payer_id: string;
    dob?: string;
    gui?: string;
    gender?: string;
    has_benefits?: boolean;
    housing_allowance?: number;
    transport_allowance?: number;
    /** Empty string when not used (individual employers). */
    organization_id?: string;
  }
): Promise<AddEmployeeResult> {
  const rawOrg = employeeData.organization_id;
  const organizationId =
    rawOrg === null || rawOrg === undefined || String(rawOrg).trim() === ''
      ? ''
      : String(rawOrg).trim();

  const token = await getAuthToken();

  try {
    const employerTaxPayerId = Number(employeeData.employer_tax_payer_id);
    const hasBenefits = Boolean(employeeData.has_benefits);
    const housingAmt = Math.max(
      0,
      Number(employeeData.housing_allowance ?? 0) || 0
    );
    const transportAmt = Math.max(
      0,
      Number(employeeData.transport_allowance ?? 0) || 0
    );

    const payload = {
      employees: [
        {
          basic_salary: String(employeeData.salary),
          contract_type: employeeData.contract_type,
          date_of_completion: employeeData.date_of_completion ?? '',
          date_of_employment: employeeData.date_of_employment,
          dob: employeeData.dob ?? '',
          email: '',
          employer_tax_payer_id: employeeData.employer_tax_payer_id,
          employment_no: '',
          gender: employeeData.gender ?? '',
          gui: employeeData.gui ?? '',
          housing_allowance: String(hasBenefits ? housingAmt : 0),
          items: [],
          msisdn: employeeData.msisdn,
          name: employeeData.name,
          no: '1',
          nssf_no: employeeData.nssf_no ?? '',
          organization_id: organizationId,
          pin: employeeData.pin,
          primary_employee: employeeData.primary_employee ? 'yes' : 'no',
          shif_no: employeeData.shif_no ?? '',
          transport_allowance: String(hasBenefits ? transportAmt : 0),
          type: employeeData.type
        }
      ],
      employer_type: 'individual',
      employer_tax_payer_id: Number.isNaN(employerTaxPayerId)
        ? employeeData.employer_tax_payer_id
        : employerTaxPayerId
    };

    const url = `${BASE_URL}/payroll/employee`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    logger.info('Payload:', payload);
    logger.info('URL:', url);
    logger.info('Headers:', headers);

    const response = await axios.post(url,payload, { headers });
    
    return { success: true, message: response.data?.message || 'Employee added successfully' };
  } catch (error: any) {
    const data = error.response?.data;
    logger.error('API Error:', data || error.message);
    const msg =
      messageFromPayrollErrorData(data) ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Failed to add employee';
    return { success: false, message: msg, error: msg };
  }
}

/**
 * POST .../payroll/employee/:uuid/update
 * payroll.json "Edit Employee" example body: { "basic_salary": "65000" } only; other fields are not documented there.
 */
export async function updateEmployee(
  employeeUuid: string,
  updates: Record<string, any>
): Promise<any> {
  const token = await getAuthToken();

  try {
    const payload = { ...updates };
    if (
      payload.basic_salary !== undefined &&
      typeof payload.basic_salary !== 'string'
    ) {
      payload.basic_salary = String(payload.basic_salary);
    }

    const response = await axios.post(
      `${BASE_URL}/payroll/employee/${employeeUuid}/update`,
      payload,
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
 * Activate employee (toggle status to active)
 */
export async function activateEmployee(employeeUuid: string): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/employee/${employeeUuid}/toggle-status`,
      { status: true, deactivation_reason: '' },
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
  /*
   * Sends the employee upload template Excel file to the user's WhatsApp
   */
  const templateUrl = await getEmployeeTemplateUrl();
  
  try {
    const result = await sendWhatsAppDocument({
      recipientPhone: whatsappNumber,
      documentUrl: templateUrl,
      caption: 'Here is the Employee Upload Template. Fill it out and upload it back.',
      filename: 'Employee Upload Template.xlsx'
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send WhatsApp document');
    }

    return { success: true };
  } catch (error: any) {
    logger.error('WhatsApp document error:', error);
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
 * Submit parsed rows as POST `/payroll/employee` — same outer body as payroll.json "Add Single Employee":
 * `{ employees, employer_type, employer_tax_payer_id }`. This app uses `employer_type: "individual"` and empty string `organization_id` on rows when unset.
 */
export async function submitBulkEmployees(
  employees: unknown[],
  employerTaxPayerId: string
): Promise<BulkSubmitResult> {
  const token = await getAuthToken();

  try {
    const idNum = Number(employerTaxPayerId);
    const employerId = Number.isNaN(idNum) ? employerTaxPayerId : idNum;

    const response = await axios.post(
      `${BASE_URL}/payroll/employee`,
      {
        employees,
        employer_type: 'individual',
        employer_tax_payer_id: employerId
      },
      {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
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
        employer_tax_payer_id: String(employerTaxPayerId),
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
    const params: Record<string, string> = {};
    if (employerTaxPayerId) params.employer_tax_payer_id = employerTaxPayerId;
    if (organizationId) params.organization_id = organizationId;

    const response = await axios.get(`${BASE_URL}/payroll/get-periods`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params
    });

    const raw = response.data;
    if (!Array.isArray(raw)) {
      return {
        success: false,
        periods: [],
        error: 'get-periods response is not a JSON array (shape not defined in payroll.json)'
      };
    }

    const periods: PayrollPeriod[] = [];
    for (const entry of raw) {
      if (typeof entry !== 'string') {
        return {
          success: false,
          periods: [],
          error: 'get-periods array entries must be strings (shape not defined in payroll.json)'
        };
      }
      periods.push({
        period: entry,
        label: new Date(entry).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      });
    }

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
 * GET /payroll/:ref_no — fetch a single payroll by reference number
 */
export async function getPayrollByRefNo(refNo: string): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.get(`${BASE_URL}/payroll/${encodeURIComponent(refNo)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * POST /payroll/:ref_no/update — update payroll (e.g. status)
 */
export async function updatePayrollRecord(
  refNo: string,
  body: Record<string, unknown>
): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/${encodeURIComponent(refNo)}/update`,
      body,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * GET /payroll/stats — payroll statistics
 */
export async function getPayrollStatistics(): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.get(`${BASE_URL}/payroll/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * GET /payroll/employee/:uuid — single employee
 */
export async function getEmployeeByUuid(uuid: string): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.get(`${BASE_URL}/payroll/employee/${encodeURIComponent(uuid)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * GET /payroll/employee/download-payslip/:ref_no
 */
export async function getEmployeePayslipDownloadUrl(refNo: string): Promise<string> {
  return `${BASE_URL}/payroll/employee/download-payslip/${encodeURIComponent(refNo)}`;
}

/**
 * POST /payroll/:ref_no/send-payslips
 */
export async function sendPayrollPayslips(refNo: string): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/${encodeURIComponent(refNo)}/send-payslips`,
      {},
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * POST /payroll/:ref_no/send-one-payslip
 */
export async function sendSinglePayslip(
  refNo: string,
  employeeUuid: string,
  email: string
): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/${encodeURIComponent(refNo)}/send-one-payslip`,
      { employee_uuid: employeeUuid, email },
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * POST /payroll/:ref_no/file-return — file PAYE return
 */
export async function filePayeReturn(refNo: string): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/${encodeURIComponent(refNo)}/file-return`,
      {},
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * POST /payroll/update-paye-token
 */
export async function updatePayeToken(body: {
  token: string;
  expires_at: string;
}): Promise<any> {
  const authToken = await getAuthToken();

  try {
    const response = await axios.post(`${BASE_URL}/payroll/update-paye-token`, body, {
      headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * POST /payroll/make-payment — generate payment (e.g. AHL)
 */
export async function makePayrollPayment(body: {
  ref_no: string;
  type: string;
}): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.post(`${BASE_URL}/payroll/make-payment`, body, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

/**
 * GET /static/reports/:filename — report file URL (from export download_url flow)
 */
export async function getStaticReportFileUrl(filename: string): Promise<string> {
  return `${BASE_URL}/static/reports/${encodeURIComponent(filename)}`;
}

/**
 * POST {{baseUrl}}/payroll/export-reports (per docs/payroll_docs)
 * Body per payroll.json Tax Reports / Payroll Reports: report_type, period, payroll_ref_no
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
 * Resolve relative report download paths to a full URL using API_URL (same host as payroll API).
 */
export async function resolveFullReportDownloadUrl(downloadUrl: string): Promise<string> {
  if (!downloadUrl) return '';
  if (/^https?:\/\//i.test(downloadUrl)) return downloadUrl;
  if (!BASE_URL) throw new Error('API_URL is not set');
  const base = BASE_URL.replace(/\/$/, '');
  const path = downloadUrl.startsWith('/') ? downloadUrl : `/${downloadUrl}`;
  return `${base}${path}`;
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
    logger.error('Webhook error:', error);
    throw new Error('Failed to send report to WhatsApp');
  }
}