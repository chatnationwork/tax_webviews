import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Received data:", body);

    const data = await fetch(
      `https://kratest.pesaflow.com/api/customs/passenger-declaration/convert-currency?amount=${body.amount}&currency=${body.currency}`
    );

    if (!data.ok) {
      throw new Error("Failed to fetch data");
    }

    const value = await data.json();

   console.log("Value:", value);

    //if value is less than 10000 return error
    if (value.converted_amount < 10000) {
     throw new Error("Value is less than 10000");
    }

    return NextResponse.json({ value: value }, { status: 200 });
  } catch (error) {
    console.error("Error during create entity process:", error);
    const errorMessage = error instanceof Error ? error.message : "Error with currency conversion";
    return NextResponse.json({ error,message: errorMessage }, { status: 500 });
  }
}

// https://kratest.pesaflow.com/api/customs/passenger-declaration
