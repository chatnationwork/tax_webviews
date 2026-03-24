import type { ItrState, ItrConfig, DisabilityCertDetail, InsurancePolicyEntry, EmploymentIncomeRow, MortgageEntry, TaxComputation } from './definitions';

// Simple state management using singleton pattern
class TaxpayerStore {
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
    prn?: string;
    filingPeriod?: string;
    error?: string;
    successMessage?: string;
    liabilities?: any[];
  } = {
    msisdn: '',
    idNumber: '',
    yob: 0,
    fullName: '',
    pin: '',
    filingYear: new Date().getFullYear(),
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

  setFilingPeriod(period: string) {
    this.data.filingPeriod = period;
  }

  setPrn(prn: string) {
    this.data.prn = prn;
  }

  setError(error: string) {
    this.data.error = error;
  }

  setSuccessMessage(message: string) {
    this.data.successMessage = message;
  }

  setTaxAmount(amount: number) {
    this.data.taxAmount = amount;
  }

  getTaxpayerInfo() {
    return this.data;
  }

  clear() {
    const msisdn = this.data.msisdn;
    this.data = {
      msisdn,
      idNumber: '',
      yob: 0,
      fullName: '',
      pin: '',
      filingYear: new Date().getFullYear(),
      liabilities: [],
    };
    this.clearItr();
  }

  // ITR wizard state
  private itrData: ItrState = this.freshItrState();

  private freshItrState(): ItrState {
    return {
      hasInsurancePolicy: false,
      insurancePolicies: [],
      hasDisabilityExemption: false,
      disabilityCertificates: [],
      isPwd: false,
      itExemptionCertDetails: [],
      employmentIncomeRows: [],
      mortgages: [],
      filingPeriod: '',
      obligationId: '',
      obligationCode: '',
      taxReturnId: null,
      taxPayerId: null,
      taxObligationId: null,
      pensionContribution: 0,
      shifContribution: 0,
      hlContribution: 0,
      pmfContribution: 0,
    };
  }

  setItrField<K extends keyof ItrState>(key: K, value: ItrState[K]) {
    this.itrData[key] = value;
  }

  getItrData(): ItrState {
    return this.itrData;
  }

  clearItr() {
    this.itrData = this.freshItrState();
  }

  setLiabilities(liabilities: any[]) {
      this.data.liabilities = liabilities;
  }

  getLiabilities() {
      return this.data.liabilities;
  }
}

export const taxpayerStore = new TaxpayerStore();
