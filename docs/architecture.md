# Application Architecture

## Overview
ChatNation is a compliance platform designed to be consumed primarily through **WhatsApp WebViews**. The application provides a suite of services (Tax Filing, eTIMS Invoicing, Customs Declarations) that users access directly from their WhatsApp interface.

## Core Design Principles

### 1. WhatsApp-First Delivery
The application is built to be served within the constrained environment of a mobile WebView inside WhatsApp.
- **Context Injection**: Users are identified by their phone number, which is passed as a query parameter in the URL (e.g., `?phone=2547XXXXXXXX`).
- **Session Continuity**: The application extracts this phone number on entry and persists it (via cookies or local state) to maintain the session across different pages without requiring traditional login screens.

### 2. Entry Points

The application is structured with multiple entry points to serve different user intents.

#### General Entry Point (`app/page.tsx`)
**Route**: `/`
- Acts as the main landing page or "App Store" for the platform.
- Displays the full catalog of available services (PIN Services, Return Filing, eTIMS Invoicing, etc.).
- **Function**: Routing. When a user selects a service, this page constructs the correct URL for the specific module, appending the user's phone number to ensure context is passed along.

#### eTIMS Module (`app/etims/page.tsx`)
**Route**: `/etims`
- Dedicated entry point for Electronic Tax Invoice Management System (eTIMS) workflows.
- Handles tasks like Sales Invoices, Credit Notes, and Buyer-Initiated Invoices.
- Uses `app/etims/_lib/useSession.ts` to enforce authentication, ensuring a phone number is present or redirecting to an auth flow if missing.

#### Tax Return Module (`app/nil-mri-tot/page.tsx`)
**Route**: `/nil-mri-tot`
- Dedicated entry point for tax return filing (NIL, MRI, TOT).
- Immediately checks for the `phone` or `msisdn` query parameter to initialize the filing session.

## Authentication & Session Management
- **Mechanism**: The phone number acts as the primary user identifier.
- **Flow**:
    1. **Inbound**: Link is clicked in WhatsApp -> `https://app-url.com/some-path?phone=2547...`
    2. **Extraction**: The page component or `useSession` hook extracts `searchParams.get('phone')`.
    3. **Persistence**: The phone number is stored in the application state (e.g., `taxpayerStore` or cookies).
    4. **Guard**: Protected routes check for this stored phone number. If missing, they redirect to an "Auth" page (often just a prompt to re-enter the number or a "Session Expired" message).
- **Public Paths**: Certain paths (like `*/auth`, `*/otp`, and root `/`) are whitelisted to allow entry without an active session.

## Data Flow
- **Frontend**: Next.js (App Router) with React Server Components and Client Components.
- **State Management**: Zustand stores (e.g., `taxpayerStore`) for managing multi-step form data (like tax filing wizards).
- **Backend Integration**: Server Actions are used for data mutation and fetching, keeping the client lightweight and secure.

## Key Directories
- `app/`: Main application routes.
- `app/_components/`: Shared UI components (Layout, etc.).
- `app/etims/`: eTIMS specific logic and components.
- `app/nil-mri-tot/`: Tax return filing logic.
- `app/actions/`: Server actions for backend logic.

## Backend Architecture

The application employs a **Backend for Frontend (BFF)** pattern using Next.js Server Actions. It does not maintain a local database for business data but instead acts as a secure proxy to external APIs.

### 1. Server Actions as API Proxies
- **Location**: `app/actions/*.ts` (e.g., `etims.ts`)
- **Role**: Validates inputs, handles session context (cookies), and forwards requests to the upstream API.
- **Security**: 
    - API keys and base URLs are kept on the server side.
    - Sensitive headers (Authorization tokens) are injected in the Server Action, preventing exposure to the client.

### 2. External API Integration
- **Upstream Service**: The app connects to the `kratest.pesaflow.com` API (e.g., `/api/ussd`).
- **Communication**: Uses `axios` for HTTP requests.
- **Headers**:
    - `Authorization`: `Bearer <token>` (retrieved from HTTP-only cookies).
    - `x-source-for`: `whatsapp` (identifies the traffic source/channel).

### 3. Data Persistence
- **No Local Database**: The Next.js app is stateless regarding business data (invoices, returns, customer profiles). All such data is fetched in real-time from the upstream API.
- **Session Store**: `cookies()` are used to store authentication tokens (`etims_auth_token`), creating a stateless session mechanism compatible with the distributed nature of serverless deployments.

