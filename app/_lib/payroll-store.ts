// Simple state management using singleton pattern
class PayrollStore {
  private data: {
    msisdn: string;
    idNumber: string;
    yob: number;
    fullName: string;
    pin: string;
    filingYear: number;
    selectedNilType?: string;
    rentalIncome?: number;
    grossSales?: number;
    filingMode?: 'daily' | 'monthly';
    paymentType?: 'file-only' | 'file-and-pay' | 'pay-now';
    receiptNumber?: string;
    taxAmount?: number;
    // Payroll employee data
    employeeData: {
      nationality: 'citizen' | 'resident' | 'non-resident';
      idNumber: string;
      kraPin: string;
      firstName: string;
      employerTaxPayerId: string;
      employerKraPin: string;
      employmentType: string;
      startDate: string;
      basicSalary: number;
      hasBenefits: boolean;
      // System-derived fields from validation
      dob?: string;
      nssfNo?: string;
      shifNo?: string;
      fullName?: string;
      gender?: string;
    };
    // Organization context for bulk upload
    organizationContext: {
      organizationId: string;
      taxPayerId: string;
    };
    // Payroll processing context
    payrollContext: {
      period: string;
      employerTaxPayerId: string;
      contractTypes: string[];
    };
  } = {
    msisdn: '',
    idNumber: '',
    yob: 0,
    fullName: '',
    pin: '',
    filingYear: new Date().getFullYear(),
    employeeData: {
      nationality: 'citizen',
      idNumber: '',
      kraPin: '',
      firstName: '',
      employerTaxPayerId: '',
      employerKraPin: '',
      employmentType: 'permanent',
      startDate: '',
      basicSalary: 0,
      hasBenefits: false,
    },
    organizationContext: {
      organizationId: '',
      taxPayerId: '',
    },
    payrollContext: {
      period: '',
      employerTaxPayerId: '',
      contractTypes: [],
    },
  };

  setMsisdn(msisdn: string) {
    this.data.msisdn = msisdn;
  }

  getMsisdn() {
    return this.data.msisdn;
  }

  setTaxpayerInfo(idNumber: string, yob: number, fullName: string, pin: string) {
    this.data.idNumber = idNumber;
    this.data.yob = yob;
    this.data.fullName = fullName;
    this.data.pin = pin;
  }

  setSelectedNilType(type: string) {
    this.data.selectedNilType = type;
  }

  setRentalIncome(amount: number) {
    this.data.rentalIncome = amount;
  }

  setGrossSales(amount: number) {
    this.data.grossSales = amount;
  }

  setFilingMode(mode: 'daily' | 'monthly') {
    this.data.filingMode = mode;
  }

  setPaymentType(type: 'file-only' | 'file-and-pay' | 'pay-now') {
    this.data.paymentType = type;
  }

  setReceiptNumber(receiptNumber: string) {
    this.data.receiptNumber = receiptNumber;
  }

  setTaxAmount(amount: number) {
    this.data.taxAmount = amount;
  }

  getTaxpayerInfo() {
    return this.data;
  }

  // Payroll employee methods
  setEmployeeData(data: Partial<typeof this.data.employeeData>) {
    this.data.employeeData = { ...this.data.employeeData, ...data };
  }

  getEmployeeData() {
    return this.data.employeeData;
  }

  clearEmployeeData() {
    this.data.employeeData = {
      nationality: 'citizen',
      idNumber: '',
      kraPin: '',
      firstName: '',
      employerTaxPayerId: '',
      employerKraPin: '',
      employmentType: 'permanent',
      startDate: '',
      basicSalary: 0,
      hasBenefits: false,
    };
  }

  // Organization context methods
  setOrganizationContext(data: Partial<typeof this.data.organizationContext>) {
    this.data.organizationContext = { ...this.data.organizationContext, ...data };
  }

  getOrganizationContext() {
    return this.data.organizationContext;
  }

  // Payroll processing methods
  setPayrollContext(data: Partial<typeof this.data.payrollContext>) {
    this.data.payrollContext = { ...this.data.payrollContext, ...data };
  }

  getPayrollContext() {
    return this.data.payrollContext;
  }

  clear() {
    const msisdn = this.data.msisdn; // Preserve msisdn across sessions
    this.data = {
      msisdn,
      idNumber: '',
      yob: 0,
      fullName: '',
      pin: '',
      filingYear: new Date().getFullYear(),
      employeeData: {
        nationality: 'citizen',
        idNumber: '',
        kraPin: '',
        firstName: '',
        employerTaxPayerId: '',
        employerKraPin: '',
        employmentType: 'permanent',
        startDate: '',
        basicSalary: 0,
        hasBenefits: false,
      },
      organizationContext: {
        organizationId: '',
        taxPayerId: '',
      },
      payrollContext: {
        period: '',
        employerTaxPayerId: '',
        contractTypes: [],
      },
    };
  }
}

export const payrollStore = new PayrollStore();

