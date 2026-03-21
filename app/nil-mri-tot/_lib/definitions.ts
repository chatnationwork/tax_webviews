// ITR — Insurance Policy
export interface InsurancePolicyEntry {
  typeOfPolicy: string;
  policyHolder: string;
  insuranceCompanyPin: string;
  insurancePolicyNumber: string;
  ageOfChild?: string;
  commencementDate: string;
  maturityDate: string;
  sumAssured: number;
  annualPremiumPaid: number;
  amountOfInsuranceRelief: number;
}

// ITR — Employment Income row (read-only from API)
export interface EmploymentIncomeRow {
  employerPin: string;
  employerName: string;
  grossPay: number;
  valueOfCarBenefit: number;
  pension: number;
  netValueOfHousing: number;
  totalEmploymentIncome: number;
  taxableSalary: number;
  amountOfTaxDeductedPaye: number;
  taxPayableOnTaxableSalary: number;
}

// ITR — Tax Computation (editable line items)
export interface TaxComputation {
  totalDeduction: number;
  definedPensionContribution: number;
  socialHealthInsuranceContribution: number;
  housingLevyContribution: number;
  postRetirementMedicalContribution: number;
  employmentIncome: number;
  allowableTaxExemptionDisability: number;
  netTaxableIncome: number;
  taxOnTaxableIncome: number;
  personalRelief: number;
  insuranceRelief: number;
  taxCredits: number;
  payeDeductedFromSalary: number;
  incomeTaxPaidInAdvance: number;
  creditsTotalReliefDtaa: number;
  taxRefundDue: number;
}

// ITR — full wizard state
export interface ItrState {
  hasInsurancePolicy: boolean;
  insurancePolicies: InsurancePolicyEntry[];
  hasDisabilityExemption: boolean;
  disabilityCertificateNumber?: string;
  employmentIncomeRows: EmploymentIncomeRow[];
  taxComputation?: TaxComputation;
  filingPeriod: string;
  obligationId: string;
  obligationCode: string;
  receiptNumber?: string;
  error?: string;
  successMessage?: string;
}
