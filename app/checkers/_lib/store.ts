// Simple state management using singleton pattern
// Uses shared session store for msisdn persistence

import { saveKnownPhone, getKnownPhone } from '../../_lib/session-store';

class TaxpayerStore {
  private data: {
    msisdn: string;
    name: string;
  } = {
    msisdn: '',
    name: '',
  };

  setMsisdn(msisdn: string) {
    this.data.msisdn = msisdn;
    saveKnownPhone(msisdn); // Also persist to shared store
  }

  getMsisdn() {
    // Try local data first, then shared store
    return this.data.msisdn || getKnownPhone() || '';
  }

  setName(name: string) {
    this.data.name = name;
  }

  getName() {
    return this.data.name;
  }

  clear() {
    const msisdn = this.data.msisdn; // Preserve msisdn across sessions
    this.data = {
      msisdn,
      name: '',
    };
  }
}

export const taxpayerStore = new TaxpayerStore();
