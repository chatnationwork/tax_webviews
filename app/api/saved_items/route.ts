import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Atomic fetch + delete
    const [savedItems] = await prisma.$transaction([
      prisma.savedItem.findMany({
        where: { phone: body.phone },
      }),
      prisma.savedItem.deleteMany({
        where: { phone: body.phone },
      }),
    ]);

    const items = savedItems.map((item) => {
      // Build result object with only relevant fields for each category
      const result: any = {
        category: item.category,
        item: item.item,
        phone: item.phone,
      };

      // Add file array if present
      if (item.file && item.file.length > 0) {
        result.file = item.file;
      }

      // Category-specific fields
      if (item.category === "Mobile Device") {
        if (item.quantity) result.quantity = item.quantity;
        if (item.amount) result.amount = item.amount;
        if (item.currency) result.currency = item.currency;
        if (item.hsCode) result.hsCode = item.hsCode;
        if (item.make) result.make = item.make;
        if (item.model) result.model = item.model;
        if (item.imei) result.imei = item.imei;
      } else if (item.category === "Re-importation Goods") {
        if (item.cert) result.cert = item.cert;
      } else if (item.category === "Cash Exceeding $10,000" || item.category === "Currency over $10,000") {
        if (item.currency) result.currency = item.currency;
        if (item.valueOfFund) result.valueOfFund = item.valueOfFund;
        if (item.sourceOfFund) result.sourceOfFund = item.sourceOfFund;
        if (item.purposeOfFund) result.purposeOfFund = item.purposeOfFund;
      } else {
        // Default: include standard commercial item fields if present
        if (item.quantity) result.quantity = item.quantity;
        if (item.amount) result.amount = item.amount;
        if (item.currency) result.currency = item.currency;
        if (item.hsCode) result.hsCode = item.hsCode;
      }

      return result;
    });


    // Format items for string representation
    const itemsString = items
      .map((item, index) => {
        let str = `Item ${index + 1}:\n`;
        Object.entries(item).forEach(([key, value]) => {
          if (key !== 'phone') { // Don't include phone in display
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            if (Array.isArray(value)) {
              str += `${label}: ${value.join(', ')}\n`;
            } else {
              str += `${label}: ${value}\n`;
            }
          }
        });
        return str;
      })
      .join('\n');

    return NextResponse.json(
      { message: "Success", itemsString, items },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during fetch + delete:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
