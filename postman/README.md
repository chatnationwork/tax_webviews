# Postman Collections Documentation

This document provides an overview of all Postman collections in this directory and their endpoints.

---

## Table of Contents

1. [Add Obligation](#1-add-obligation)
2. [F88 API](#2-f88-api)
3. [Generate Payment](#3-generate-payment)
4. [KRA USSD Service](#4-kra-ussd-service)
5. [PIN Registration](#5-pin-registration)
6. [Payment Summary](#6-payment-summary)
7. [WhatsApp API Authentication](#7-whatsapp-api-authentication)
8. [WhatsApp](#8-whatsapp)

---

## 1. Add Obligation

**File:** `Add Obligation.postman_collection.json`

**Description:** APIs for adding tax obligations (TOT, MRI, PAYE) to taxpayer accounts via KRA iTax UAT.

**Base URL:** `https://itaxuat.kra.go.ke/Eservices/KRA/`

**Authentication:** Bearer Token

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/kra/v1/add-obligation` | POST | Add TOT (Turnover Tax) obligation |
| `/kra/v1/add-obligation` | POST | Add MRI (Monthly Rental Income) obligation |
| `/kra/v1/add-obligation` | POST | Add PAYE obligation |
| `/auth/v1/Authenticate` | POST | Authenticate user to get token |

**Request Body Example (TOT):**
```json
{
  "taxpayerPIN": "P000000000R",
  "obligationID": "8",
  "effectivePeriod": "01/05/2022",
  "estimatedMonthlyTurnover": "30000"
}
```

---

## 2. F88 API

**File:** `F88 Api.postman_collection(3).json`

**Description:** Customs Form F88 (Passenger Declaration) APIs - used for declaring goods at Kenya customs entry points.

**Base URL:** `{{url}}` (configurable, default: localhost:4000)

**Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/customs/passenger-declaration` | POST | Initiate passenger declaration |
| `/api/customs/passenger-declaration` | POST | Submit passenger information |
| `/api/customs/travel-information` | POST | Submit travel information |
| `/api/customs/declaration` | POST | Submit goods declaration |
| `/api/static/standard-codes` | GET | Fetch standard codes |
| `/api/static/countries` | GET | Fetch countries list |
| `/api/static/currencies` | GET | Fetch currencies list |
| `/api/customs/fetch-f88` | GET | Fetch existing F88 form |
| `/api/customs/submit` | POST | Final form submission |
| `/api/customs/hs-codes` | GET | Search HS codes |
| `/api/customs/payment-slip` | GET | Get payment slip |
| `/api/customs/f88-form` | GET | Download F88 form |
| `/api/otp/send` | POST | Send OTP |
| `/api/otp/verify` | POST | Verify OTP |
| `/api/customs/entry-points` | GET | Get entry points |

---

## 3. Generate Payment

**File:** `Generate Payment.postman_collection(1).json`

**Description:** APIs for generating Payment Registration Numbers (PRN) and making payments for tax obligations.

**Base URL:** `https://kratest.pesaflow.com/api/ussd/`

**Header Required:** `x-forwarded-for: triple_2_ussd`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/make-payment` | POST | Initiate payment |
| `/generate-prn` | POST | Generate PRN for obligation |

**Request Body Example (Generate PRN):**
```json
{
  "tax_payer_pin": "A003032441Y",
  "obligation_id": "41",
  "tax_period_from": "01-06-2025",
  "tax_period_to": "30-06-2025",
  "amount": "4"
}
```

---

## 4. KRA USSD Service

**File:** `KRA USSD Service.postman_collection.json`

**Description:** Core KRA eTIMS USSD service APIs - comprehensive collection for USSD-based tax services.

**Base URL:** `{{base_url}}` (default: `https://kratests.pesaflow.com`)

**Categories:**

### Registration & Validation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ussd/pin-registration` | POST | Register for KRA PIN |
| `/api/ussd/init` | POST | Initialize USSD service |
| `/api/ussd/id-lookup` | POST | Lookup taxpayer by ID |
| `/api/ussd/register-tax-payer` | POST | Register taxpayer for USSD |

### eTIMS Invoicing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ussd/post-sale` | POST | Create sale invoice |
| `/api/ussd/search/credit-note` | POST | Search invoice for credit note |
| `/api/ussd/submit/credit-note` | POST | Submit credit note |

### Buyer-Initiated Invoices
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ussd/buyer-initiated/lookup` | POST | Lookup seller for buyer-initiated invoice |
| `/api/ussd/buyer-initiated/submit/invoice` | POST | Create buyer-initiated invoice |
| `/api/ussd/buyer-initiated/fetch/{msisdn}` | GET | Fetch pending invoices for seller |
| `/api/ussd/buyer-initiated/action/submit` | POST | Accept/reject buyer invoice |

---

## 5. PIN Registration

**File:** `PIN Registration Copy.postman_collection.json`

**Description:** Simple PIN registration endpoint for citizens/residents.

**Base URL:** `https://kratest.pesaflow.com/api/ussd/`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pin-registration` | POST | Register for KRA PIN |

**Request Body:**
```json
{
  "type": "citizen",
  "email": "your_email@example.com",
  "msisdn": "254712345678",
  "id_number": "12345678"
}
```

---

## 6. Payment Summary

**File:** `Payment summary.postman_collection(2).json`

**Description:** APIs for viewing taxpayer liabilities and generating payments.

**Base URL:** `https://kratest.pesaflow.com/api/ussd/`

**Header Required:** `x-forwarded-for: triple_2_ussd`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tax-payer-liabilities` | GET | Get obligation liabilities (params: obligation_id, tax_payer_pin) |
| `/generate-prn` | POST | Generate payment from liabilities |

**Obligation IDs:**
- `8` = MRI (Monthly Rental Income)
- `33` = TOT (Turnover Tax)

---

## 7. WhatsApp API Authentication

**File:** `WhatsApp API Authentication Copy.postman_collection.json`

**Description:** OTP generation and validation for USSD & WhatsApp integrations.

**Base URL:** `https://kratest.pesaflow.com/api/ussd/`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/otp` | POST | Generate OTP |
| `/validate-otp` | POST | Validate OTP |

**Request Bodies:**
```json
// Generate OTP
{ "msisdn": "0727307123" }

// Validate OTP
{ "msisdn": "0727307123", "otp": "NJHWIA" }
```

---

## 8. WhatsApp

**File:** `whatsapp.postman_collection.json`

**Description:** WhatsApp bot integration APIs for various KRA services.

**Base URL:** `{{base_url}}`

### Tax Filing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ussd/file-return` | POST | File NIL return |
| `/api/ussd/obligation-filling-period` | POST | Fetch filing period |

### Taxpayer Verification (Checkers)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/taxpayer/pin-checker` | GET | Validate KRA PIN |
| `/api/taxpayer/staff-checker` | GET | Verify KRA staff |
| `/api/taxpayer/excise-license-checker` | GET | Check excise license |
| `/api/taxpayer/vat-exemption-certificate` | GET | Check VAT exemption certificate |
| `/api/taxpayer/import-certificate` | GET | Check import certificate |
| `/api/taxpayer/declaration-checker` | GET | Check customs declaration |
| `/api/taxpayer/application-status` | GET | Check application status |
| `/api/control-unit-checker` | GET | Verify control unit serial |
| `/api/invoice-number-checker` | GET | Verify eTIMS invoice |
| `/api/itax/validate-tcc` | GET | Validate Tax Compliance Certificate |
| `/api/witholding-tax-agent-checker/vat` | GET | Check VAT withholding tax agent |

---

## Service Groupings

Based on the endpoints, these collections can be grouped by service:

### 1. **Pesaflow USSD Service** (kratest.pesaflow.com)
- KRA USSD Service
- PIN Registration
- WhatsApp API Authentication
- Generate Payment
- Payment Summary
- WhatsApp

### 2. **KRA iTax UAT** (itaxuat.kra.go.ke)
- Add Obligation

### 3. **F88 Customs** (localhost/deployed)
- F88 API

---

## Common Headers

Most APIs on `kratest.pesaflow.com` require:
```
x-forwarded-for: triple_2_ussd
Content-Type: application/json
```

---

## Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `base_url` | Pesaflow API base URL | `https://kratest.pesaflow.com` |
| `url` | F88 API base URL | `http://localhost:4000` |
