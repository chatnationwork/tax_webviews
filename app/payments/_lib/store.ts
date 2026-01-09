// Simple state management using singleton pattern for Payment Services
class TaxpayerStore {
  private data: {
    msisdn: string;
    idNumber: string;
    yob: number;
    fullName: string;
    pin: string;
    // Payment-specific fields
    taxPeriodFrom?: string;
    taxPeriodTo?: string;
    amount?: number;
    prn?: string;
    checkoutUrl?: string;
    paymentStatus?: 'pending' | 'success' | 'failed';
    paymentMessage?: string;
  } = {
    msisdn: '',
    idNumber: '',
    yob: 0,
    fullName: '',
    pin: '',
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

  setPaymentDetails(taxPeriodFrom: string, taxPeriodTo: string, amount: number) {
    this.data.taxPeriodFrom = taxPeriodFrom;
    this.data.taxPeriodTo = taxPeriodTo;
    this.data.amount = amount;
  }

  setPrn(prn: string) {
    this.data.prn = prn;
  }

  setCheckoutUrl(url: string) {
    this.data.checkoutUrl = url;
  }

  setPaymentStatus(status: 'pending' | 'success' | 'failed', message?: string) {
    this.data.paymentStatus = status;
    this.data.paymentMessage = message;
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
    };
  }
}

export const taxpayerStore = new TaxpayerStore();
