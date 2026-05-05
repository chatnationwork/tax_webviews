// ITR — Insurance Policy
export interface InsurancePolicyEntry {
  typeOfPolicy: string;
  policyHolder: string;
  insuranceCompanyPin: string;
  insuranceCompanyName?: string;
  insurancePolicyNumber: string;
  ageOfChild?: string;
  commencementDate: string;
  maturityDate: string;
  sumAssured: number;
  annualPremiumPaid: number;
  amountOfInsuranceRelief: number;
}

// ITR — Mortgage entry
export interface MortgageEntry {
  pinOfLender: string;
  nameOfLender: string;
  mortgageAccountNo: string;
  amountBorrowed: number;
  outstandingAmount: number;
  interestAmountPaid: number;
  validPin?: boolean;
}

// ITR — Disability certificate from KRA
export interface DisabilityCertDetail {
  certNo: string;
  effectiveDate: string;
  expiryDate: string;
}

// ITR — Employment Income row (read-only from API)
export interface EmploymentIncomeRow {
  employerPin: string;
  employerName: string;
  grossPay: number;
  valueOfCarBenefit: number;
  pension: number;
  netValueOfHousing: number;
  allowancesBenefits: number;
  totalEmploymentIncome: number;
  taxableSalary: number;
  amountOfTaxDeductedPaye: number;
  taxPayableOnTaxableSalary: number;
  amountOfTaxPayableRefundable: number;
}

// ITR — Tax Computation (editable line items)
export interface TaxComputation {
  totalDeduction: number;
  definedPensionContribution: number;
  socialHealthInsuranceContribution: number;
  housingLevyContribution: number;
  postRetirementMedicalContribution: number;
  mortgageInterest: number;
  depositInHomeOwnershipSavingPlan: number;
  employmentIncome: number;
  allowableTaxExemptionDisability: number;
  netTaxableIncome: number;
  taxOnTaxableIncome: number;
  totalOfTaxPayableLessReliefsAndExemptions: number;
  personalRelief: number;
  insuranceRelief: number;
  taxCredits: number;
  payeDeductedFromSalary: number;
  incomeTaxPaidInAdvance: number;
  creditsTotalReliefDtaa: number;
  taxRefundDue: number;
}

// ITR config from /api/settings/itr/config
export interface ItrConfigLimits {
  hlevy: { max: number; min: number };
  insurance_relief: { max: number; min: number };
  mortgage: { interestCap: { max: number; min: number } };
  pension: { max: number; min: number };
  prmc: { max: number; min: number };
}

export interface ItrConfig {
  default: ItrConfigLimits;
  [yearKey: string]: ItrConfigLimits | number;
}

// Summary from the employment income API response
export interface EmploymentIncomeSummary {
  totalPAYEDeducted: number;
  totalTaxPayable: number;
  amountPayableOrRefundable: number;
  personalRelief: number;
  isPwd: boolean;
  // Additional top-level fields returned by the API
  ahLevy: number;
  shiFund: number;
  pension: number;
  prmFund: number;
  insuranceRelief: number;
  mortgageInterest: number;
  totalGrossPay: number;
  totalTaxablePay: number;
}

// Structured arrays from GET /tax-return-itr and POST /tax-return/itr-create
export interface ItrReturnMortgage {
  id: string;
  pinOfLender: string;
  nameOfLender: string;
  mortgageAccountNo: string;
  amountBorrowed: number;
  outstandingAmount: number;
  interestAmountPaid: number;
  validPin: boolean;
}

export interface ItrReturnInsurancePolicy {
  id: string;
  pin: string;
  insurerName: string;
  typeOfPolicy: string;
  insurancePolicyNo: string;
  policyHolder: string;
  childAge: number;
  commencementDate: string;
  maturityDate: string;
  sumAssured: number;
  annualPremiumPaid: number;
  amountOfInsuranceRelief: number;
  validPin: boolean;
}

export interface ItrReturnCarBenefit {
  id: string;
  pinOfEmployer: string;
  nameOfEmployer: string;
  carRegNo: string;
  make: string;
  bodyType: string;
  ccRating: string;
  typeOfCar: string;
  costOfCar: number;
  costOfHire: number;
  periodOfUse: string;
  carBenefitAmount: number;
  validPin: boolean;
  validRegNo: boolean;
}

export interface ItrReturnDisabilityCert {
  id: string;
  certNo: string;
  effectiveDate: string;
  expiryDate: string;
}

// ITR — full wizard state
export interface ItrState {
  hasInsurancePolicy: boolean;
  insurancePolicies: InsurancePolicyEntry[];
  hasDisabilityExemption: boolean;
  disabilityCertificateNumber?: string;
  disabilityCertificates: DisabilityCertDetail[];
  isPwd: boolean;
  itExemptionCertDetails: DisabilityCertDetail[];
  employmentIncomeRows: EmploymentIncomeRow[];
  employmentIncomeSummary?: EmploymentIncomeSummary;
  // Structured arrays from /tax-return-itr and /tax-return/itr-create
  itrReturnMortgages?: ItrReturnMortgage[];
  itrReturnInsurancePolicies?: ItrReturnInsurancePolicy[];
  itrReturnCarBenefits?: ItrReturnCarBenefit[];
  itrReturnDisabilityCerts?: ItrReturnDisabilityCert[];
  taxReturnRef?: string;
  itrStatus?: string;
  mortgages: MortgageEntry[];
  taxComputation?: TaxComputation;
  itrConfig?: ItrConfig;
  filingPeriod: string;
  obligationId: string;
  obligationCode: string;
  taxReturnId: number | null;
  taxPayerId: number | null;
  taxObligationId: number | null;
  pensionContribution: number;
  shifContribution: number;
  hlContribution: number;
  pmfContribution: number;
  receiptNumber?: string;
  error?: string;
  successMessage?: string;
}
