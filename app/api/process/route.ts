import { NextRequest, NextResponse } from "next/server";
import { parseSpreadsheet, matchTier } from "@/lib/spreadsheet";
import type { TierEntry } from "@/lib/types";

function isBrazil(country: string): boolean {
  const c = (country || "").toLowerCase().trim();
  return c.includes("brazil") || c.includes("brasil");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const tierEntriesRaw = formData.get("tierEntries") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const tierEntries: TierEntry[] = tierEntriesRaw
      ? JSON.parse(tierEntriesRaw)
      : [];

    const buffer = await file.arrayBuffer();
    const cleanedRows = parseSpreadsheet(buffer);

    const processedRows = cleanedRows.map((row) => {
      const brazil = isBrazil(row.Country);
      return {
        ...row,
        "Proactive or Spontaneous": "",
        "With Impact or Without Impact": "",
        Tier: brazil ? matchTier(row.URL, tierEntries) : "",
      };
    });

    processedRows.sort((a, b) => {
      const aBrazil = isBrazil(a.Country);
      const bBrazil = isBrazil(b.Country);
      if (aBrazil && !bBrazil) return -1;
      if (!aBrazil && bBrazil) return 1;
      if (!aBrazil && !bBrazil) {
        return (a.Country || "").localeCompare(b.Country || "", "pt-BR");
      }
      return 0;
    });

    return NextResponse.json({ rows: processedRows, total: processedRows.length });
  } catch (error) {
    console.error("Process error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}