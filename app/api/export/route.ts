import { NextRequest, NextResponse } from "next/server";
import { exportToXLSX } from "@/lib/spreadsheet";

export async function POST(request: NextRequest) {
  try {
    const { rows } = await request.json();
    if (!rows || !Array.isArray(rows)) return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    const buffer = exportToXLSX(rows);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="RPAutomation_Export_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
