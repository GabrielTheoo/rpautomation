import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/public/companies — lista empresas para uso no formulário de cadastro
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name FROM companies ORDER BY name ASC
    `;
    return NextResponse.json({ companies: rows });
  } catch (err) {
    console.error("[public/companies GET]", err);
    return NextResponse.json({ companies: [] });
  }
}
