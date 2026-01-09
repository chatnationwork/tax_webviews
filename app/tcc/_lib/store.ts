import { saveKnownPhone, getKnownPhone } from '../../_lib/session-store';

// Simple state management using singleton pattern for TCC Application
class TaxpayerStore {
  private data: {
    msisdn: string;
    idNumber: string;
    yob: number;
    fullName: string;
    pin: string;
    // TCC specific fields
    tccReason?: string;
    tccNumber?: string;
    tccStatus?: string;
  } = {
    msisdn: '',
    idNumber: '',
    yob: 0,
    fullName: '',
    pin: '',
  };

  setMsisdn(msisdn: string) {
    this.data.msisdn = msisdn;
    saveKnownPhone(msisdn); // Also persist to shared store
  }

  getMsisdn() {
    // Try local data first, then shared store
    return this.data.msisdn || getKnownPhone() || '';
  }

  setTaxpayerInfo(idNumber: string, yob: number, fullName: string, pin: string) {
    this.data.idNumber = idNumber;
    this.data.yob = yob;
    this.data.fullName = fullName;
    this.data.pin = pin;
  }

  getTaxpayerInfo() {
    return {
      idNumber: this.data.idNumber,
      yob: this.data.yob,
      fullName: this.data.fullName,
      pin: this.data.pin,
    };
  }

  setTccApplication(reason: string, tccNumber?: string, status?: string) {
    this.data.tccReason = reason;
    this.data.tccNumber = tccNumber;
    this.data.tccStatus = status;
  }

  getTccApplication() {
    return {
      reason: this.data.tccReason,
      tccNumber: this.data.tccNumber,
      status: this.data.tccStatus,
    };
  }

  clear() {
    this.data = {
      msisdn: '',
      idNumber: '',
      yob: 0,
      fullName: '',
      pin: '',
    };
  }
}

export const taxpayerStore = new TaxpayerStore();
