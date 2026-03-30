import { NextRequest, NextResponse } from "next/server";
import { parseSpreadsheet, matchTier } from "@/lib/spreadsheet";
import type { TierEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const tierEntriesRaw = formData.get("tierEntries") as string;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    const tierEntries: TierEntry[] = tierEntriesRaw ? JSON.parse(tierEntriesRaw) : [];
    const buffer = await file.arrayBuffer();
    const cleanedRows = parseSpreadsheet(buffer);
    const processedRows = cleanedRows.map((row) => ({
      ...row,
      "Proactive or Spontaneous": "",
      "With Impact or Without Impact": "",
      Tier: matchTier(row.URL, tierEntries),
    }));
    return NextResponse.json({ rows: processedRows, total: processedRows.length });
  } catch (error) {
    console.error("Process error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
