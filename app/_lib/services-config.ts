/**
 * Service Configuration
 *
 * This file contains metadata for all services that use the confirmation page flow.
 * Services not listed here (e.g., eTIMS, F88) will use direct navigation.
 */

export interface ServiceConfig {
  key: string;
  name: string;
  description: string;
  targetUrl: string;
}

export const SERVICES_CONFIG: Record<string, ServiceConfig> = {
  // Return Filing
  "NIL Filing": {
    key: "NIL Filing",
    name: "NIL Returns",
    description: "File a NIL return for Income Tax, MRI, VAT, or PAYE where no tax was due for the selected period.",
    targetUrl: "/nil-mri-tot/nil/validation",
  },
  "MRI": {
    key: "MRI",
    name: "Monthly Rental Income",
    description: "File and pay Monthly Rental Income tax.",
    targetUrl: "/nil-mri-tot/mri/validation",
  },
  "TOT": {
    key: "TOT",
    name: "Turnover Tax",
    description: "File and Pay Daily and Monthly Turn Over Tax.",
    targetUrl: "/nil-mri-tot/tot/validation",
  },
  "ITR": {
    key: "ITR",
    name: "Income Tax Return",
    description: "File Individual Income Tax Return for employment income.",
    targetUrl: "/nil-mri-tot/itr/validation",
  },

  // Tax Compliance
  "TCC Application": {
    key: "TCC Application",
    name: "TCC Application",
    description: "Apply for or check the status of your Tax Compliance Certificate.",
    targetUrl: "/tcc/validation",
  },

  // Verification Services
  "PIN Check": {
    key: "PIN Check",
    name: "PIN Checker",
    description: "Confirm whether a KRA PIN is valid and active.",
    targetUrl: "/checkers/pin-checker",
  },
  "Invoice Check": {
    key: "Invoice Check",
    name: "Invoice Checker",
    description: "Verify the status and authenticity of an invoice issued through KRA systems.",
    targetUrl: "/checkers/invoice-checker",
  },
  "TCC Check": {
    key: "TCC Check",
    name: "TCC Checker",
    description: "Check the status of a Tax Compliance Certificate.",
    targetUrl: "/checkers/tcc-checker",
  },
  "Staff Check": {
    key: "Staff Check",
    name: "Staff Checker",
    description: "Confirm whether an individual is a legitimate KRA staff member.",
    targetUrl: "/checkers/staff-checker",
  },
  "Station": {
    key: "Station",
    name: "Know Your Station",
    description: "Identify the KRA tax station responsible for your tax matters.",
    targetUrl: "/checkers/know-your-station",
  },
  "Import Check": {
    key: "Import Check",
    name: "Import Certificate Checker",
    description: "Verify the validity of an import certificate.",
    targetUrl: "/checkers/import-certificate",
  },

  // Payments
  "eSlip": {
    key: "eSlip",
    name: "eSlip Payment",
    description: "Make eSlip payments to KRA.",
    targetUrl: "/payments/eslip/payment",
  },
  "NITA": {
    key: "NITA",
    name: "NITA Levy",
    description: "Pay NITA Levy.",
    targetUrl: "/payments/nita/payment",
  },
  "AHL": {
    key: "AHL",
    name: "Housing Levy",
    description: "Pay Affordable Housing Levy.",
    targetUrl: "/payments/ahl/payment",
  },

  // PIN Services
  "PIN Registration": {
    key: "PIN Registration",
    name: "PIN Registration",
    description: "Register for a new KRA PIN.",
    targetUrl: "/pin-registration/select-type",
  },
  "PIN Retrieve": {
    key: "PIN Retrieve",
    name: "PIN Retrieval",
    description:
      "Retrieve your forgotten KRA PIN using your National ID number.",
    targetUrl: "/pin-retrieval",
  },
};

/**
 * Services that should skip the confirmation page (direct navigation)
 */
export const SKIP_CONFIRMATION_SERVICES = [
  "Sales Invoice",
  "Credit Note",
  "Buyer-Initiated Invoices",
  "F88 Declaration",
];

/**
 * Check if a service should use the confirmation flow
 */
export function shouldUseConfirmation(serviceKey: string): boolean {
  if (SKIP_CONFIRMATION_SERVICES.includes(serviceKey)) {
    return false;
  }
  return serviceKey in SERVICES_CONFIG;
}

/**
 * Get service configuration by key
 */
export function getServiceConfig(serviceKey: string): ServiceConfig | undefined {
  return SERVICES_CONFIG[serviceKey];
}

/**
 * All NEXT_PUBLIC_SERVICE_* env vars, collected at build time.
 * Maps normalised key (e.g. "NIL_FILING") → value string.
 * We grab every matching var once so the runtime lookup is a simple object read.
 */
const SERVICE_ENV_FLAGS: Record<string, string> = Object.entries(
  process.env
)
  .filter(([k]) => k.startsWith("NEXT_PUBLIC_SERVICE_"))
  .reduce<Record<string, string>>((acc, [k, v]) => {
    acc[k.replace("NEXT_PUBLIC_SERVICE_", "")] = v ?? "";
    return acc;
  }, {});

/**
 * Converts a SERVICE_URLS key to its env-var suffix.
 * e.g. "NIL Filing" → "NIL_FILING", "eSlip" → "ESLIP"
 */
function toEnvSuffix(serviceKey: string): string {
  return serviceKey.toUpperCase().replace(/\s+/g, "_");
}

/**
 * Determines whether a self-serve (green) menu item should be visible.
 *
 * Rules:
 *  - NEXT_PUBLIC_SERVICE_<KEY>=false  → hidden
 *  - NEXT_PUBLIC_SERVICE_<KEY>=true   → visible
 *  - env var not set at all           → visible (default)
 *
 * Only meaningful for items that have an entry in SERVICE_URLS (self-serve).
 * Assisted (blue) items are unaffected because they are never checked.
 */
export function isServiceVisible(serviceKey: string): boolean {
  const flag = SERVICE_ENV_FLAGS[toEnvSuffix(serviceKey)];
  if (flag === undefined) return true; // not set → show
  return flag.toLowerCase() !== "false";
}
