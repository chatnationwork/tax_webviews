import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// extracts ISO-like 2-letter country codes
function extractValidCountries(countries: unknown[]): string[] {
  const codes: string[] = [];

  countries.forEach((entry) => {
    // Case 1: already a valid ISO code
    if (typeof entry === "string" && entry.length === 2) {
      codes.push(entry);
      return;
    }

    // Case 2: extract from object
    if (typeof entry === "object" && entry !== null) {
      for (const val of Object.values(entry)) {
        if (typeof val === "string" && val.length === 2) {
          codes.push(val);
          break;
        }
      }
    }
  });

  return [...new Set(codes)];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Success", validCountries: ["KE", "UG", "TZ"] },
      { status: 200 }
    );

    // 1. Fetch + delete inside a transaction to avoid races
    const [records] = await prisma.$transaction([
      prisma.visitedCountires.findMany({ where: { phone } }),
      prisma.visitedCountires.deleteMany({ where: { phone } }),
    ]);

    // If nothing was found
    if (!records || records.length === 0) {
      throw new Error("No visited countries found for this phone");
    }

    // 2. Merge all country arrays from DB (in case multiple rows exist)
    const allCountries: unknown[] = [];
    records.forEach((r) => {
      if (Array.isArray(r.country)) {
        allCountries.push(...r.country);
      }
    });

    // 3. Extract valid country codes
    const validCountries = extractValidCountries(allCountries);

    return NextResponse.json(
      { message: "Success", validCountries },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching/deleting countries:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
