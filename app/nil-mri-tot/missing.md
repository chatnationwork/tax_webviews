# API Endpoints Documentation

This document lists API endpoints used by the NIL/MRI/TOT Tax Filing application, including both available and missing endpoints.

---

## Table of Contents

### Available APIs (Implemented)
- [Buyer Lookup (Taxpayer Validation)](#buyer-lookup-taxpayer-validation)

### Missing APIs (Need Implementation)
1. [WhatsApp Notifications](#1-whatsapp-notifications)
2. [Taxpayer Obligations Lookup](#2-taxpayer-obligations-lookup)
3. [MRI Return with Amount](#3-mri-return-with-amount)
4. [TOT Return with Amount](#4-tot-return-with-amount)
5. [Payment Initiation for Returns](#5-payment-initiation-for-returns)
6. [Receipt Download/Generation](#6-receipt-downloadgeneration)

---

# Available APIs

## 1. GUI Lookup (Primary - Recommended) ✅

### Status: **IMPLEMENTED & TESTED**

Validates a taxpayer by ID number. Returns the actual KRA PIN.

### Endpoint
```
GET https://kratest.pesaflow.com/api/itax/gui-lookup
```

### Headers
```
x-source-for: whatsapp
```

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `gui` | string | The ID Number (e.g., "37998670") |
| `tax_payer_type` | string | Always "KE" for Kenya |

### Example Request
```
GET https://kratest.pesaflow.com/api/itax/gui-lookup?gui=37998670&tax_payer_type=KE
```

### Response (Success)
```json
{
  "Message": "Valid ID",
  "PIN": "A016678608H",
  "ResponseCode": "30000",
  "Status": "OK",
  "TaxpayerName": "ARUNI06 T*** O*****"
}
```

### Response Codes
| Code | Meaning |
|------|---------|
| `30000` | Valid ID |
| Other | Invalid/Error |

### Test Result (ID: 37998670)
✅ **WORKS** - Returns taxpayer name and actual KRA PIN

---

## 2. Buyer Lookup (Fallback)

### Status: **IMPLEMENTED (FALLBACK)**

Alternative endpoint for taxpayer validation. Requires Year of Birth.

### Endpoint
```
POST https://etims.1automations.com/buyer_lookup
```

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "pin": "37998670",    // NOTE: This field takes the ID NUMBER (not actual KRA PIN)
  "waba": "waba_id",    // WhatsApp Business Account ID (optional)
  "yob": "2000"         // Year of Birth (required)
}
```

### Important Note
> ⚠️ The `pin` field in the request body is confusingly named - it actually expects the **ID Number**, not the KRA PIN.

### Response (Success)
```json
{
  "success": true,
  "code": 3,
  "message": "Valid Taxpayer",
  "name": "JOHN DOE"
}
```

### Response (Error)
```json
{
  "success": false,
  "data": "Invalid Payload"
}
```

### Test Result (ID: 37998670, YOB: 2000)
❌ **FAILED** - Returns "Invalid Payload"

---

## Usage in App

Both APIs are integrated in `app/actions/tax-filing.ts`:

```typescript
lookupTaxpayerById(idNumber: string, yob?: number, waba?: string)
```

**Flow:**
1. Primary: Try GUI Lookup (kratest.pesaflow.com)
2. Fallback: Try Buyer Lookup (etims.1automations.com)
3. Mock: Return test data for ID "12345678"

### Components Using This
- `NilValidation.tsx` - Validates taxpayer before NIL filing
- `MriValidation.tsx` - Validates taxpayer before MRI filing
- `TotValidation.tsx` - Validates taxpayer before TOT filing

---

# Missing APIs

## 1. WhatsApp Notifications

### Current Status: **NOT IMPLEMENTED**

The application needs to send WhatsApp notifications to users after filing returns or making payments.

### Expected Endpoint
```
POST /api/ussd/send-whatsapp-notification
```

### Expected Request Body
```json
{
  "msisdn": "254712345678",
  "message_type": "nil_filed | mri_filed | tot_filed | payment_receipt",
  "data": {
    "taxpayer_name": "JOHN DOE",
    "pin": "A00*****9M",
    "return_type": "VAT NIL | MRI | TOT",
    "receipt_number": "NIL-1702546789012",
    "amount": 50000.00,
    "tax_amount": 5000.00,
    "period": "01/12/2024 - 31/12/2024"
  }
}
```

### Expected Response
```json
{
  "success": true,
  "message": "WhatsApp notification sent successfully",
  "message_id": "wa-123456789"
}
```

### Usage Points in App
- `NilResult.tsx` - After NIL return is filed successfully
- `MriResult.tsx` - After MRI return is filed successfully  
- `TotResult.tsx` - After TOT return is filed successfully
- After any payment is completed

---

## 2. Taxpayer Obligations Lookup

### Current Status: **MOCK IMPLEMENTATION**

Need to determine what obligations a taxpayer has registered (VAT, ITR, PAYE, MRI, TOT).

### Expected Endpoint
```
GET /api/ussd/taxpayer-obligations?pin={pin}
```
or
```
GET /api/ussd/taxpayer-obligations?id_number={id}&msisdn={msisdn}
```

### Expected Response
```json
{
  "success": true,
  "obligations": [
    {
      "id": "1",
      "name": "VAT",
      "status": "active",
      "last_filed": "November 2024"
    },
    {
      "id": "33",
      "name": "MRI",
      "status": "active",
      "last_filed": "October 2024"
    },
    {
      "id": "8",
      "name": "TOT",
      "status": "active",
      "last_filed": "November 2024"
    }
  ]
}
```

### Currently Using
- `app/actions/tax-filing.ts` → `getTaxpayerObligations()` returns mock data

---

## 3. MRI Return with Amount

### Current Status: **UNCONFIRMED**

The existing `/api/ussd/file-return` endpoint needs to support MRI returns with rental income amounts.

### Expected Request Body Enhancement
```json
{
  "kra_obligation_id": "33",
  "returnPeriod": "01/12/2024 - 31/12/2024",
  "returnType": "mri_return",
  "tax_payer_pin": "A00*****9M",
  "rental_income": 50000.00,
  "tax_amount": 5000.00
}
```

### Expected Response
```json
{
  "code": 1,
  "message": "MRI Return filed successfully",
  "receipt_number": "MRI-1702546789012",
  "tax_amount": 5000.00,
  "payment_due": true,
  "prn": "PRN123456789"
}
```

### Notes
- Need confirmation if `rental_income` and `tax_amount` fields are supported
- Need to know if PRN is generated automatically or needs separate call

---

## 5. TOT Return with Amount

### Current Status: **UNCONFIRMED**

Similar to MRI, the `/api/ussd/file-return` endpoint needs to support TOT returns with gross sales amounts.

### Expected Request Body Enhancement
```json
{
  "kra_obligation_id": "8",
  "returnPeriod": "14/12/2024",
  "returnType": "tot_return",
  "tax_payer_pin": "A00*****9M",
  "gross_sales": 100000.00,
  "tax_amount": 3000.00,
  "filing_mode": "daily | monthly"
}
```

### Expected Response
```json
{
  "code": 1,
  "message": "TOT Return filed successfully",
  "receipt_number": "TOT-1702546789012",
  "tax_amount": 3000.00,
  "payment_due": true,
  "prn": "PRN123456789"
}
```

### Notes
- Daily filing may have different period format than monthly
- Confirmation needed on `filing_mode` support

---

## 6. Payment Initiation for Returns

### Current Status: **PARTIAL**

The existing `/api/ussd/generate-prn` and `/api/ussd/make-payment` may not integrate with newly filed returns.

### Expected Flow
1. File return → get receipt number
2. Generate PRN for the return
3. Initiate M-Pesa STK push

### Missing Endpoint Possibility
```
POST /api/ussd/initiate-return-payment
```

### Expected Request Body
```json
{
  "msisdn": "254712345678",
  "receipt_number": "MRI-1702546789012",
  "tax_amount": 5000.00,
  "payment_method": "mpesa_stk"
}
```

### Expected Response
```json
{
  "success": true,
  "checkout_request_id": "ws_CO_12345",
  "merchant_request_id": "mr_12345",
  "message": "STK push sent to 254712345678"
}
```

---

## 7. Receipt Download/Generation

### Current Status: **NOT IMPLEMENTED**

After filing, users may need to download a PDF receipt.

### Expected Endpoint
```
GET /api/ussd/download-receipt?receipt_number={receipt_number}&format=pdf
```

### Expected Response
- Content-Type: application/pdf
- Binary PDF file

### Alternative: WhatsApp Delivery
```
POST /api/ussd/send-receipt-whatsapp
```
```json
{
  "msisdn": "254712345678",
  "receipt_number": "NIL-1702546789012"
}
```

---

## Summary Table

| API | Status | Priority | Notes |
|-----|--------|----------|-------|
| WhatsApp Notifications | Missing | HIGH | Core feature for WhatsApp bot |
| Taxpayer Obligations | Mock | MEDIUM | Returns hardcoded values |
| YOB Validation | Partial | LOW | Currently ignored |
| MRI with Amount | Unconfirmed | HIGH | Need backend confirmation |
| TOT with Amount | Unconfirmed | HIGH | Need backend confirmation |
| Payment Initiation | Partial | HIGH | Integration unclear |
| Receipt Download | Missing | MEDIUM | PDF generation needed |

---

## Implementation Notes

### For Backend Team:

1. **WhatsApp Integration**: All successful filing/payment actions should trigger WhatsApp notifications automatically, or provide a webhook for the frontend to call.

2. **Return Types**: Confirm the difference between:
   - `nil_return` - Zero income declaration
   - `mri_return` - Monthly Rental Income with amount
   - `tot_return` - Turnover Tax with amount

3. **Error Codes**: Please document all possible response codes:
   - `code: 1` = Success?
   - `code: 3` = Valid ID?
   - `code: 4` = Invalid ID?
   - Other codes?

4. **Rate Limiting**: Are there rate limits on filing returns per taxpayer?

5. **Duplicate Prevention**: How are duplicate filings for the same period handled?

---

## Contact

For questions about these missing APIs, contact the backend development team.
