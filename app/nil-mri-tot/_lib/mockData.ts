// Mock taxpayer database
export const mockTaxpayers: Record<string, {
  fullName: string;
  pin: string;
  yob: number;
  hasVATObligation?: boolean;
  hasITRObligation?: boolean;
  hasPAYEObligation?: boolean;
  hasMRIObligation?: boolean;
  hasTOTObligation?: boolean;
  lastFiledVAT?: string;
  lastFiledITR?: string;
  lastFiledPAYE?: string;
  lastFiledMRI?: string;
  lastFiledTOT?: string;
}> = {
  "12345678": {
    fullName: "JOHN DOE",
    pin: "A00*****9M",
    yob: 1990,
    hasVATObligation: true,
    hasITRObligation: true,
    hasPAYEObligation: true,
    hasMRIObligation: true,
    hasTOTObligation: true,
    lastFiledMRI: "November 2024",
    lastFiledTOT: "October 2024",
  },
  "87654321": {
    fullName: "JANE SMITH",
    pin: "B12*****5K",
    yob: 1985,
    hasVATObligation: false,
    hasITRObligation: true,
    hasPAYEObligation: false,
    hasMRIObligation: false,
    hasTOTObligation: true,
    lastFiledTOT: "November 2024",
  },
  "11223344": {
    fullName: "PETER OCHIENG",
    pin: "C45*****7L",
    yob: 1992,
    hasVATObligation: true,
    hasITRObligation: false,
    hasPAYEObligation: true,
    hasMRIObligation: true,
    hasTOTObligation: false,
    lastFiledMRI: "October 2024",
  },
};

export const validateTaxpayer = (idNumber: string, yob: number) => {
  const taxpayer = mockTaxpayers[idNumber];
  if (taxpayer && taxpayer.yob === yob) {
    return taxpayer;
  }
  return null;
};

export const getCurrentFilingYear = () => 2024;

export const getLatestMRIPeriod = () => "December 2024";
export const getLatestTOTPeriod = () => "November 2024";
export const getCurrentDate = () => "December 12, 2025";
