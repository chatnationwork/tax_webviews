# ITR API Audit — Gap Fill Plan

**Date:** 2026-05-05  
**Branch:** timv-temv  
**Scope:** Close the gap between what the three ITR APIs return and what the code reads/uses.  
**Rule:** Use exact field names from the live API payloads. No custom fallback status messages — server message passed through as-is.

---

## Live API Payloads (reference)

### 1. `GET /tax-return/itr-employment-details`
```json
{
  "DETAILS": [{ "PAYEDeducted", "employerName", "employerPin", "grossPay", "pension", "taxPayableOnTaxablePay", "taxablePay" }],
  "ahLevy": 4700.25,
  "shiFund": 8617.2,
  "pension": 163794.29,
  "prmFund": 0.0,
  "insuranceRelief": 0.0,
  "mortgageInterest": 0.0,
  "totalGrossPay": 476064.29,
  "totalTaxablePay": 298952.55,
  "totalPAYEDeducted": 123461.8,
  "totalTaxPayable": 7524.03,
  "amountPayableOrRefuindable": 0.0,
  "personalRelief": 28800,
  "isPwd": "N",
  "itExemptionCertDetails": []
}
```

### 2. `GET /tax-return-itr` and `POST /tax-return/itr-create` (same shape)
```json
{
  "id": 362,
  "status": "pending",
  "published": true,
  "tax_return_ref": "TRX-YFTGVJ",
  "kra_account_number": "KRA2026352906608",
  "pension_contribution": "200000",
  "shif_contribution": "30000",
  "hl_contribution": "50000",
  "pmf_contribution": "5000",
  "tax_due": "-84283.8350",
  "meta_data": { ... },
  "mortgage": [{ "id", "pin_of_lender", "name_of_lender", "mortgage_account_no", "amount_borrowed", "outstanding_amount", "interest_amount_paid", "interest_paid", "valid_pin" }],
  "insurance_policy": [{ "id", "pin", "insurer_name", "type_of_policy", "insurance_policy_no", "policy_holder", "child_age", "commencement_date", "maturity_date", "sum_assured", "annual_premium_paid", "amount_of_insurance_relief", "valid_pin" }],
  "car_benefit": [{ "id", "pin_of_employer", "name_of_employer", "car_reg_no", "make", "body_type", "cc_rating", "type_of_car", "cost_of_car", "cost_of_hire", "period_of_use", "car_benefit_amount", "valid_pin", "valid_reg_no" }],
  "disability_certificate": [{ "id", "cert_no", "effective_date", "expiry_date" }],
  "advance_tax": [],
  "home_ownership": [],
  "self_assessment_tax": [],
  "employment_income": [{ "id", "employer_pin", "employer_name", "gross_pay", "pension", "net_value_of_housing", "value_of_car_benefit", "allowances_benefits", "total_employment_income", "taxable_salary", "tax_payable_on_taxable_salary", "amount_of_tax_deducted_paye", "amount_of_tax_payable_refundable" }],
  "response": { "AckNumber", "Message", "ResponseCode", "Status" }
}
```

### 3. `GET /tax-return/itr-summary/:id`
```json
{
  "allowable_tax_exemption_incase_of_person_with_disability": "0",
  "credits": 0,
  "defined_pension_contribution": "200000",
  "deposit_in_home_ownership_saving_plan": 0,
  "employment_income": "1721529.55",
  "hl_contribution": "50000",
  "income_tax_paid_in_advance": "0",
  "insurance_relief": "45",
  "mortgage_interest": "60000",
  "net_taxable_income": "1376529.55",
  "paye_deducted_from_salary": "405797.7",
  "personal_relief": "28800",
  "pmf_contribution": "5000",
  "shif_contribution": "30000",
  "tax_credits": "405797.7",
  "tax_due_refund_due": "-84283.8350",
  "tax_on_taxable_income": "350358.8650",
  "total_deduction": "345000",
  "total_of_tax_payable_less_reliefs_and_exemptions": "321513.8650"
}
```
**Status:** Already fully mapped in `mapSummaryToComputation()` — no changes needed.

---

## Gaps Found

### Gap A — `getItrEmploymentDetails` drops 8 top-level fields

The `summary` object returned only has 5 fields. API returns 8 more:

| API field | Maps to | Used for |
|---|---|---|
| `ahLevy` | `summary.ahLevy` | Pre-fill HL deduction input |
| `shiFund` | `summary.shiFund` | Pre-fill SHIF deduction input |
| `pension` | `summary.pension` | Pre-fill pension deduction input |
| `prmFund` | `summary.prmFund` | Pre-fill PMF deduction input |
| `insuranceRelief` | `summary.insuranceRelief` | Display / audit |
| `mortgageInterest` | `summary.mortgageInterest` | Display / audit |
| `totalGrossPay` | `summary.totalGrossPay` | Display |
| `totalTaxablePay` | `summary.totalTaxablePay` | Display |

Also: `isPwd` and `itExemptionCertDetails` **are** returned but **never stored** in the store — so `return-information/page.tsx` always sees them as empty.

### Gap B — `getItrReturn` and `createItrReturn` drop all structured arrays

Both endpoints return rich arrays that users currently enter manually:

| Array | Fields | Current handling |
|---|---|---|
| `mortgage[]` | 9 fields | Completely ignored |
| `insurance_policy[]` | 13 fields | Completely ignored |
| `car_benefit[]` | 14 fields | Completely ignored |
| `disability_certificate[]` | 4 fields | Completely ignored |
| `advance_tax[]` | — | Completely ignored |
| `home_ownership[]` | — | Completely ignored |

Also dropped: `tax_return_ref`, `status`, `kra_account_number`, top-level `pension_contribution`, `shif_contribution`, `hl_contribution`, `pmf_contribution`.

### Gap C — Custom fallback error messages

Every catch block adds a custom string (e.g. `'Failed to load employment income details'`) that masks the server's actual message. Requirement: pass `error.response?.data?.message || error.response?.data?.Message || error.message`.

### Gap D — Store missing fields

The store `itrData` has no slots for `isPwd`, `itExemptionCertDetails`, `employmentIncomeSummary` — so the employment-income page can't hand them to return-information even if it fetched them.

---

## Implementation Plan

### Step 1 — `definitions.ts`: extend types
- [ ] Expand `EmploymentIncomeSummary` with 8 new fields
- [ ] Add `ItrReturnMortgage`, `ItrReturnInsurancePolicy`, `ItrReturnDisabilityCert`, `ItrReturnCarBenefit` interfaces
- [ ] Expand `ItrReturnResult` to include the structured arrays + metadata fields
- [ ] Expand `CreateItrReturnResult` to include the same arrays

### Step 2 — `store.ts`: add missing itrData fields
- [ ] Add `isPwd`, `itExemptionCertDetails`, `employmentIncomeSummary` to `itrData` and `clearItr()`

### Step 3 — `nil-mri-tot.ts`: fix `getItrEmploymentDetails`
- [ ] Add 8 missing fields to the `summary` return object
- [ ] Remove custom fallback error message → server message only

### Step 4 — `nil-mri-tot.ts`: fix `getItrReturn`
- [ ] Extract `mortgage[]`, `insurance_policy[]`, `car_benefit[]`, `disability_certificate[]` with exact field names
- [ ] Extract `tax_return_ref`, `status`, `kra_account_number`, top-level contribution fields
- [ ] Add extracted values to return object
- [ ] Remove custom fallback error message

### Step 5 — `nil-mri-tot.ts`: fix `createItrReturn`
- [ ] Apply same extraction logic as `getItrReturn` to the create response (same shape)
- [ ] Remove custom fallback error message

### Step 6 — `employment-income/page.tsx`: store full summary
- [ ] After `getItrEmploymentDetails` succeeds, store `summary`, `isPwd`, `itExemptionCertDetails` in the store
- [ ] Remove custom fallback error message in `handleNext`

### Step 7 — `return-information/page.tsx`: pre-fill from stored summary
- [ ] Initialise pension/shif/hl/pmf `useState` from summary fields (`pension`, `shiFund`, `ahLevy`, `prmFund`) when the contribution is 0 and summary value is non-zero
- [ ] Remove custom fallback error message

---

## Audit Checklist

- [x] `getItrEmploymentDetails` returns `ahLevy`, `shiFund`, `pension`, `prmFund`, `insuranceRelief`, `mortgageInterest`, `totalGrossPay`, `totalTaxablePay` in `summary` — `nil-mri-tot.ts:1290`
- [x] `EmploymentIncomeResult.summary` type extended with 8 new fields — `nil-mri-tot.ts:993`
- [x] `EmploymentIncomeSummary` interface extended with 8 new fields — `definitions.ts:88`
- [x] Employment-income page stores `employmentIncomeSummary`, `isPwd`, `itExemptionCertDetails` after fetch — `employment-income/page.tsx:101`
- [x] Return-information page pre-fills pension/SHIF/HL/PMF from `employmentIncomeSummary` (`pension`, `shiFund`, `ahLevy`, `prmFund`) — `return-information/page.tsx:34`
- [x] `ItrReturnArrays` interface added — `nil-mri-tot.ts` (before createItrReturn)
- [x] `extractItrReturnArrays()` helper extracts all arrays using exact API field names — `nil-mri-tot.ts`
- [x] `getItrReturn` returns `arrays` with mortgages, insurancePolicies, carBenefits, disabilityCertificates, taxReturnRef, status, kraAccountNumber — `nil-mri-tot.ts:1565`
- [x] `createItrReturn` returns same `arrays` structure — `nil-mri-tot.ts`
- [x] Return-information page stores extracted arrays into store on createItrReturn success — `return-information/page.tsx:204`
- [x] `ItrState` extended with `itrReturnMortgages`, `itrReturnInsurancePolicies`, `itrReturnCarBenefits`, `itrReturnDisabilityCerts`, `taxReturnRef`, `itrStatus` — `definitions.ts:168`
- [x] `getItrEmploymentDetails` error: server message only — `nil-mri-tot.ts:1310`
- [x] `createItrReturn` error: server message only — `nil-mri-tot.ts`
- [x] `getItrReturn` error: server message only — `nil-mri-tot.ts:1573`
- [x] `getItrSummary` error: server message only — `nil-mri-tot.ts:1604`
- [x] `employment-income/page.tsx` errors: server message only
- [x] `return-information/page.tsx` errors: server message only
- [x] `itr-summary` mapping in `mapSummaryToComputation()` unchanged (was already correct)
- [x] `itr/verify/page.tsx` `handleFinish` — WhatsApp message now uses `periodError` (server message) for `no_period` and `obligationsMessage` (server message) for `no_obligation` instead of hardcoded strings — `verify/page.tsx:132`
- [x] `getItrFilingPeriods` catch block — removed custom fallback string, uses server message or `error.message`
- [x] TypeScript: zero errors (`npx tsc --noEmit` clean)
