// TCC Application Constants

export const TCC_REASONS = {
  'JOB_APPLICATION': 'Job Application',
  'TENDER': 'Government Tender',
  'WORK_PERMIT': 'Work Permit Application',
  'CLEARANCE': 'General Tax Clearance',
  'LOAN': 'Bank Loan Application',
  'LICENSE': 'Business License Application',
  'OTHER': 'Other Purpose',
} as const;

export type TccReasonKey = keyof typeof TCC_REASONS;
