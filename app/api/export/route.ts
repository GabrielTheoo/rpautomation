import { NextRequest, NextResponse } from "next/server";
import { exportToXLSXMultiSheet } from "@/lib/spreadsheet";

function isBrazil(country: string): boolean {
  const c = (country || "").toLowerCase().trim();
  return c.includes("brazil") || c.includes("brasil");
}

export async function POST(request: NextRequest) {
  try {
    const { rows } = await request.json();

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const groups: Record<string, Record<string, unknown>[]> = {};
    for (const row of rows) {
      const country = String((row as Record<string, unknown>).Country || "Unknown");
      if (!groups[country]) groups[country] = [];
      groups[country].push(row as Record<string, unknown>);
    }

    const sorted: Record<string, Record<string, unknown>[]> = {};
    const keys = Object.keys(groups).sort((a, b) => {
      if (isBrazil(a) && !isBrazil(b)) return -1;
      if (!isBrazil(a) && isBrazil(b)) return 1;
      return a.localeCompare(b, "pt-BR");
    });
    for (const k of keys) sorted[k] = groups[k];

    const buffer = exportToXLSXMultiSheet(sorted);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="RPAutomation_Export_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}