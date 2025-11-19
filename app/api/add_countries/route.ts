import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { country, phone } = body;

    if (!country || !phone) {
      return NextResponse.json(
        { error: "country and phone are required" },
        { status: 400 }
      );
    }

    // Check if record exists for this phone
    const existing = await prisma.visitedCountires.findFirst({
      where: { phone },
    });

    let updatedCountries: string[];

    if (existing) {
      const current = Array.isArray(existing.country) ? existing.country : [];

      // Add + dedupe
      const newList = Array.from(new Set([...current, country]));

      const updated = await prisma.visitedCountires.update({
        where: { id: existing.id },
        data: { country: newList },
      });

      updatedCountries = updated.country as string[];
    } else {
      // Create new record
      const created = await prisma.visitedCountires.create({
        data: {
          phone,
          country: [country],
        },
      });

      updatedCountries = created.country as string[];
    }

    // Convert to comma-separated string
    const countriesString = updatedCountries.join(", ");

    return NextResponse.json(
      {
        message: "Success",
        countries: updatedCountries,
        countriesString,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing visited countries:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
