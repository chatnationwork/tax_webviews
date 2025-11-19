import { NextRequest, NextResponse } from "next/server";

const fallback = {
  entries: [
    {
      description: "Currency or Reimportation",
      hs_code: "N/A",
      id: 0,
      inserted_at: "2025-06-24T14:26:04.277831",
      uom: "N/A",
      updated_at: "2025-06-24T14:26:04.277831",
    },
  ],
  page_number: 1,
  page_size: 8,
  total_entries: 1,
  total_pages: 1,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const searchItem = body.item;

    if (
      body.category === "Currency over $10,000" ||
      body.category === "Good for Re-importation"
    ) {
      return NextResponse.json(
        { message: "Success", codes: fallback },
        { status: 200 }
      );
    }

    // https://kratest.pesaflow.com/api/customs/hs-codes?search=${SCREEN_BHGCEEEGDEFHE.input_1762845169803}&page_size=8
    const hscodes = await fetch(
      `https://kratest.pesaflow.com/api/customs/hs-codes?search=${searchItem}&page_size=8`
    );
    let hscodesData = await hscodes.json();

    if (
      !hscodesData ||
      !hscodesData.entries ||
      hscodesData.entries.length < 1
    ) {
      hscodesData = fallback;
    }

    return NextResponse.json(
      { message: "Success", codes: hscodesData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during create entity process:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
