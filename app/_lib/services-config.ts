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
