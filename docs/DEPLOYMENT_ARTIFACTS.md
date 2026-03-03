# KRA Deployment Artifacts
## WhatsApp Services WebViews

**Prepared for:** Kenya Revenue Authority  
**Date:** March 3, 2026  

---

## 1. Project Overview

| Item | Details |
|:-----|:--------|
| **Application Name** | KRA WhatsApp Services WebViews |
| **Technology Stack** | Next.js 16, React 19, TypeScript, TailwindCSS 4 |
| **Delivery Channel** | WhatsApp WebView |
| **Target Users** | All Taxpayers (Individuals, Non-Individuals, VAT/Non-VAT) |
| **Backend API** | `kratest.pesaflow.com/api` (or `ecitizen.kra.go.ke/api`) |

### Core Features
- **eTIMS** - Create and send tax invoices, credit notes, and buyer-initiated workflows
- **Returns** - File Nil, MRI (Monthly Rental Income), and TOT (Turnover Tax) returns
- **Payments** - Process AHL, eSlip, and NITA payments
- **Payroll** - Manage employees, bulk upload, and payroll processing
- **Registration & Retrieval** - PIN Registration (Kenyan & Non-Kenyan) and PIN Retrieval
- **Compliance** - TCC (Tax Compliance Certificate) application and verification
- **Services** - CSAT (Customer Satisfaction Survey), Checkers, and Custom configurations

---

## 2. Environment Configuration

### Required Environment Variables

```env
# Upstream API Configuration
API_URL="https://ecitizen.kra.go.ke/api"
NEXT_PUBLIC_APP_URL="https://wa-tax.kra.go.ke"

# WhatsApp Business API Configuration
WHATSAPP_PHONE_NUMBER_ID="<Meta Business Suite Phone Number ID>"
WHATSAPP_ACCESS_TOKEN="<System User Access Token with WhatsApp messaging permissions>"
NEXT_PUBLIC_WHATSAPP_NUMBER="254700000000"
```

---

## 3. Deployment Steps

### Prerequisites
- Node.js 18 or later
- npm or yarn
- WhatsApp Business API access

### Installation & Deployment

```bash
# Prepare environment variables
cp env.example .env.production
nano .env.production  # Edit with production values

# Pull the latest Docker image
docker pull ghcr.io/chatnationwork/tax-app:latest

# Run the container
docker run -d \
  -p 3000:3000 \
  --name tax-app \
  --env-file .env.production \
  --restart always \
  ghcr.io/chatnationwork/tax-app:latest
```

The application runs on port **3000** by default.

---

## 4. Architecture Summary

### Key Design Patterns
- **WhatsApp-First**: All flows designed for mobile WebView inside WhatsApp
- **Context Injection**: Phone number passed via URL (`?phone=254...`)
- **BFF Pattern**: Server Actions proxy requests to backend API (`app/actions/*`)
- **Stateless**: No local database; all data from upstream API
- **Secure Tokens**: Auth tokens stored in HTTP-only cookies
- **PDF Proxy**: Authenticated PDFs (like invoices) are proxied through `/api/proxy/pdf` to make them accessible to the WhatsApp messaging API.

---

## 5. API Integrations (Server Actions)

All API calls route through `process.env.API_URL` based on the specific module.

### Core Modules (`app/actions/`)

| Module | Purpose | Key Endpoints/Actions |
|:-------|:--------|:----------------------|
| `auth.ts` | Central Authentication | `/otp`, `/validate-otp`, User validation (ID matching) |
| `etims.ts` | eTIMS Invoicing | `/ussd/lookup`, `/ussd/post-sale`, `/ussd/credit-note` |
| `nil-mri-tot.ts` | Tax Returns | `/returns/nil`, `/returns/mri`, `/returns/tot` filing & validation |
| `payments.ts` | Payment Processing | Ahl, eSlip, and NITA payment verification & processing |
| `payroll.ts` | Payroll Management | Employee addition, bulk uploads, calculate payroll |
| `pin-registration.ts` | PIN Registration | Taxpayer registration, identity validation |
| `pin-retrieval.ts` | PIN Retrieval | Recover PIN details |
| `tcc.ts` | Tax Compliance | Querying and applying for TCC certificates |
| `checkers.ts` | Status Verification | Verify PIN status, compliance status |
| `campaign.ts` / `csat.ts` | Feedback | Customer surveys and campaigning tracking |

### Request Headers
```
Authorization: Bearer <auth_token>
x-source-for: whatsapp
x-forwarded-for: whatsapp
Content-Type: application/json
```

---

## 6. WhatsApp Integration

### Notification Types

| Type | Trigger | Purpose |
|:-----|:--------|:--------|
| `etims_invoice` | Sales invoice created | Send Invoice PDF to seller/buyer |
| `etims_credit_note` | Credit note submitted | Send Credit Note PDF |
| `etims_buyer_pending` | Buyer invoice created | Notify buyer for approval |
| `returns_success` | Return filed | Send acknowledgement receipt |
| `payment_success` | Payment completed | Send eSlip confirmation |

### WhatsApp API Configuration
- Uses Meta WhatsApp Business Cloud API
- Proxies authenticated documents (`/api/proxy/pdf?url=...&token=...`) to bypass authentication walls when attaching files to WhatsApp messages.
- Tracks metrics locally via `analytics-server.ts`.

---

## 7. Application Routes

| Module | Routes |
|:-------|:-------|
| **Core** | `/` (Main dashboard), `/otp`, `/help` |
| **eTIMS** | `/etims/sales-invoice/*`, `/etims/credit-note/*`, `/etims/buyer-initiated/*`, `/etims/auth/*` |
| **Returns** | `/nil-mri-tot/nil/*`, `/nil-mri-tot/mri/*`, `/nil-mri-tot/tot/*` |
| **Payments** | `/payments/ahl/*`, `/payments/eslip/*`, `/payments/nita/*` |
| **Payroll** | `/payroll/add-employee/*`, `/payroll/bulk-upload`, `/payroll/process` |
| **PIN Services** | `/pin-registration/kenyan/*`, `/pin-registration/non-kenyan/*`, `/pin-retrieval/*` |
| **Compliance** | `/tcc/*`, `/checkers/*` |
| **Other** | `/f88/*`, `/csat/*`, `/campaign/*` |

---

## 8. Security Considerations

- **HTTP-Only Cookies**: Auth tokens stored securely, not accessible to JavaScript.
- **Server-Side Secrets**: API keys, backend IPs, and access tokens never exposed to the client.
- **Token Injection**: All API requests are authenticated cleanly server-side.
- **Proxy Masking**: PesaFlow API structure and secure document repositories are hidden behind the Next.js API/actions proxy layer.

---

## 9. Appendix: File Structure

```
tax/
├── app/
│   ├── _components/      # Shared UI components
│   ├── _lib/             # Shared utilities (analytics, etc.)
│   ├── actions/          # Server actions for all modules (auth, etims, payroll...)
│   ├── api/              # Next.js API routes (PDF proxy, webhooks)
│   ├── etims/            # eTIMS pages
│   ├── nil-mri-tot/      # Returns pages
│   ├── payments/         # Payments pages
│   ├── payroll/          # Payroll pages
│   ├── pin-registration/ # PIN Reg pages
│   ├── pin-retrieval/    # PIN Retrieval pages
│   ├── tcc/              # TCC pages
│   ├── f88/              # F88 specific flows
├── docs/                 # Documentation (Guides, Logging rules)
├── scripts/              # Internal utility scripts
├── lib/                  # Server-side libraries (Winston Logger)
├── .env.local            # Local dev overrides
├── .env                  # Environment template/defaults
└── package.json          # Dependencies
```
