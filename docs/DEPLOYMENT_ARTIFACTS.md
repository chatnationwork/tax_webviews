# KRA Deployment Artifacts
## WhatsApp Invoicing for NON VAT Taxpayers

**Prepared for:** Kenya Revenue Authority  
**Date:** January 8, 2026  
**Version:** 1.0

---

## 1. Project Overview

| Item | Details |
|:-----|:--------|
| **Application Name** | WhatsApp eTIMS |
| **Technology Stack** | Next.js 16, React 19, TypeScript, TailwindCSS 4 |
| **Delivery Channel** | WhatsApp WebView |
| **Target Users** | Non-VAT Registered Taxpayers |
| **Backend API** | `kratest.pesaflow.com/api/ussd` |

### Core Features
- **eTIMS Sales Invoicing** - Create and send tax invoices via WhatsApp
- **Credit Notes** - Full and partial credit note processing
- **Buyer-Initiated Invoices** - Buyer creates, Seller approves workflow

---

## 2. Environment Configuration

### Required Environment Variables

```env
# WhatsApp Business API Configuration
WHATSAPP_PHONE_NUMBER_ID="<Meta Business Suite Phone Number ID>"
WHATSAPP_ACCESS_TOKEN="<System User Access Token with WhatsApp messaging permissions>"
NEXT_PUBLIC_WHATSAPP_NUMBER="254XXXXXXXXX"
```


---

## 3. Deployment Steps

### Prerequisites
- Node.js 18 or later
- npm or yarn
- WhatsApp Business API access

### Installation & Build

```bash

# Configure environment variables
nano .env  # Edit with production values

# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

The application runs on port **3000** by default.

---

## 4. Architecture Summary


### Key Design Patterns
- **WhatsApp-First**: All flows designed for mobile WebView inside WhatsApp
- **Context Injection**: Phone number passed via URL (`?phone=254...`)
- **BFF Pattern**: Server Actions proxy requests to backend API
- **Stateless**: No local database; all data from upstream API
- **Secure Tokens**: Auth tokens stored in HTTP-only cookies

---

## 5. API Endpoints Integrated

All API calls route through `https://kratest.pesaflow.com/api/ussd`

| Endpoint | Description |
|:---------|:------------|
| `lookup` | Customer/PIN verification |
| `submit_invoice` | Create sales invoice |
| `credit_note` | Submit credit notes |
| `fetch_invoices` | Retrieve buyer-initiated invoices |
| `process_buyer_invoice` | Accept/reject buyer invoices |
| `check_user_status` | Verify eTIMS registration |
| `register_taxpayer` | Register for eTIMS service |
| `generate_otp` / `verify_otp` | Authentication |

### Request Headers
```
Authorization: Bearer <etims_auth_token>
x-source-for: whatsapp
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
| `etims_buyer_action` | Buyer accepts/rejects | Notify seller of decision |

### WhatsApp API Configuration
- Uses Meta WhatsApp Business Cloud API
- Sends PDFs as document attachments
- Sends text notifications for status updates

---

## 7. Application Routes

| Route | Description |
|:------|:------------|
| `/` | Main services dashboard |
| `/etims` | eTIMS invoicing module |
| `/etims/auth/*` | Authentication (login, OTP) |
| `/etims/sales-invoice/*` | Sales invoice wizard |
| `/etims/credit-note/*` | Credit note flow |
| `/etims/buyer-initiated/*` | Buyer/Seller invoice flow |

---

## 8. Security Considerations

- **HTTP-Only Cookies**: Auth tokens stored securely, not accessible to JavaScript
- **Server-Side Secrets**: API keys never exposed to client
- **VAT Restriction**: Hard block prevents VAT-registered taxpayers from using service
- **Token Injection**: All API requests authenticated server-side

---

## 9. Testing Resources

Test scripts available in `/scripts/`:

| Script | Purpose |
|:-------|:--------|
| `test_etims_curl.sh` | eTIMS API endpoint testing |
| `test_fetch_invoices.sh` | Invoice retrieval tests |


---

## Appendix: File Structure

```
etims/
├── app/
│   ├── _components/      # Shared UI components
│   ├── actions/          # Server actions (API proxy)
│   └── etims/            # eTIMS invoicing module
├── docs/                 # Documentation
├── scripts/              # Test scripts
├── env.example           # Environment template
└── package.json          # Dependencies
```
