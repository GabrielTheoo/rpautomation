import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sql from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") return null;
  return session;
}

// GET /api/admin/companies — list all companies with member count
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rows = await sql`
      SELECT c.id, c.name, c.created_at,
             COUNT(u.id)::int AS member_count
      FROM companies c
      LEFT JOIN users u ON u.company_id = c.id
      GROUP BY c.id, c.name, c.created_at
      ORDER BY c.created_at DESC
    `;
    return NextResponse.json({ companies: rows });
  } catch (err) {
    console.error("[admin/companies GET]", err);
    return NextResponse.json({ error: "Erro ao buscar empresas" }, { status: 500 });
  }
}

// POST /api/admin/companies — create a company
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome da empresa é obrigatório." }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO companies (name) VALUES (${name.trim()})
      RETURNING id, name, created_at
    `;

    return NextResponse.json({ company: result[0] }, { status: 201 });
  } catch (err) {
    console.error("[admin/companies POST]", err);
    return NextResponse.json({ error: "Erro ao criar empresa" }, { status: 500 });
  }
}
