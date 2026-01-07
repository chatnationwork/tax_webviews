// Shared constants for tax filing
// These map to KRA obligation IDs

export const OBLIGATION_IDS = {
  VAT: '1',
  ITR: '2',
  PAYE: '7',
  TOT: '8',
  MRI: '33',
} as const;

export type ObligationId = typeof OBLIGATION_IDS[keyof typeof OBLIGATION_IDS];
