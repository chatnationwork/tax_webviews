import { NextRequest, NextResponse } from "next/server";

export interface AssessmentMetadata {
  createdBy: string | null;
  createdDate: string | null;
  f88GsId: string | null;
  f88ItemId: number | null;
  id: string | null;
  lastModifiedBy: string | null;
  lastModifiedDate: string | null;
  submissionDate: string | null;
  taxAmount: number;
  taxBase: number;
  taxRate: number;
  taxType: string;
  uniqueAppId: string | null;
}

export interface Assessment {
  id: string;
  metadata: AssessmentMetadata;
  status: string;
  tax_amount: string;
  tax_base: string;
  tax_rate: string;
  tax_type: string;
}

export interface ContactInformation {
  id: string;
  address: string;
  email: string;
  msisdn: string;
  residence: string;
}

export interface TravelInformation {
  id: string;
  arrival_date: string;
  arrival_from: string;
  mode_of_conveyance: string;
  point_of_boarding: string;
  recently_visited_countries: string[];
  ticket_number: string;
}

export interface Item {
  id: string;
  alcohol_percent: string | null;
  attachment: string | null;
  currency: string;
  description: string;
  hscode: string;
  imei_numbers: string | null;
  make: string | null;
  model: string | null;
  purpose_of_fund: string | null;
  quantity: number;
  re_import_cert_no: string | null;
  source_of_fund: string | null;
  status: string;
  type: string;
  value: string;
  value_of_fund: string;
}

export interface Declaration {
  assesments: Assessment[];
  contact_information: ContactInformation;
  dob: string;
  eslip_number: string | null;
  external_id: string | null;
  external_status: string | null;
  firstname: string;
  gender: string;
  id: number;
  inserted_at: string;
  items: Item[];
  language: string;
  nationality: string;
  passport_number: string;
  payable: string | null;
  pin: string | null;
  pin_verified: boolean;
  profession: string | null;
  ref_no: string;
  status: string;
  surname: string;
  travel_information: TravelInformation;
  type: string;
  uid: number;
  updated_at: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Received data:", body);

    const results = await fetch(
      "https://kratest.pesaflow.com/api/customs/passenger-declaration",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data: Declaration = await results.json();

    //get the total amount of tax to be paid
    let totalTax = 0;
    if (data.assesments && Array.isArray(data.assesments)) {
      data.assesments.forEach((assessment) => {
        totalTax += parseFloat(assessment.tax_amount);
      });
    }

    console.log("Total Tax Calculated:", totalTax, data);

    return NextResponse.json(
      { message: "Success", data, totalTax },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during create entity process:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

// https://kratest.pesaflow.com/api/customs/passenger-declaration
