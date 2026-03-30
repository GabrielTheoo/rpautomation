import { NextRequest, NextResponse } from "next/server";
import { parseTierSpreadsheet } from "@/lib/spreadsheet";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const entries = parseTierSpreadsheet(buffer);

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Tier import error:", error);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
  }
}