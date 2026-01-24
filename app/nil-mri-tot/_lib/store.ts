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
    const msisdn = this.data.msisdn; // Preserve msisdn across sessions
    this.data = {
      msisdn,
      idNumber: '',
      yob: 0,
      fullName: '',
      pin: '',
      filingYear: new Date().getFullYear(),
    };
  }
}

export const taxpayerStore = new TaxpayerStore();
