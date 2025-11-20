import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Received data:", body);

    // Prepare base data with common fields
    const baseData: any = {
      phone: body.phone,
      category: body.category,
      item: body.item,
    };

    // Parse file field (handle both string and array)
    let fileArray: string[] = [];
    if (body.file) {
      if (typeof body.file === 'string') {
        // Parse if it's a JSON string
        try {
          const parsed = JSON.parse(body.file);
          fileArray = Array.isArray(parsed) ? parsed : [body.file];
        } catch {
          fileArray = [body.file];
        }
      } else if (Array.isArray(body.file)) {
        fileArray = body.file;
      }
    }
    baseData.file = fileArray;

    // Add category-specific fields
    if (body.category === "Mobile Device") {
      // Mobile Device specific fields
      if (body.quantity) baseData.quantity = body.quantity;
      if (body.amount) baseData.amount = body.amount;
      if (body.currency) baseData.currency = body.currency;
      if (body.hsCode) baseData.hsCode = body.hsCode;
      if (body.make) baseData.make = body.make;
      if (body.model) baseData.model = body.model;
      if (body.imei) baseData.imei = body.imei;
    } else if (body.category === "Re-importation Goods") {
      // Re-importation Goods specific fields
      if (body.cert) baseData.cert = body.cert;
    } else if (body.category === "Cash Exceeding $10,000" || body.category === "Currency over $10,000") {
      // Cash specific fields
      if (body.currency) baseData.currency = body.currency;
      if (body.valueOfFund) baseData.valueOfFund = body.valueOfFund;
      if (body.sourceOfFund) baseData.sourceOfFund = body.sourceOfFund;
      if (body.purposeOfFund) baseData.purposeOfFund = body.purposeOfFund;
    } else {
      // Default: store standard commercial item fields
      if (body.quantity) baseData.quantity = body.quantity;
      if (body.amount) baseData.amount = body.amount;
      if (body.currency) baseData.currency = body.currency;
      if (body.hsCode) baseData.hsCode = body.hsCode;
    }

    await prisma.savedItem.create({
      data: baseData,
    });

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    console.error("Error saving item:", error);
    return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
  }
}
