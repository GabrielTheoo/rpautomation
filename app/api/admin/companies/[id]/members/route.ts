import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sql from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") return null;
  return session;
}

// GET /api/admin/companies/[id]/members — list members of a company
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rows = await sql`
      SELECT id, name, email, role, company, job_title
      FROM users
      WHERE company_id = ${params.id}
      ORDER BY name
    `;
    return NextResponse.json({ members: rows });
  } catch (err) {
    console.error("[admin/companies/members GET]", err);
    return NextResponse.json({ error: "Erro ao buscar membros" }, { status: 500 });
  }
}

// PATCH /api/admin/companies/[id]/members — assign a user to this company
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

    await sql`
      UPDATE users SET company_id = ${params.id} WHERE id = ${userId}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/companies/members PATCH]", err);
    return NextResponse.json({ error: "Erro ao atribuir membro" }, { status: 500 });
  }
}

// DELETE /api/admin/companies/[id]/members — remove a user from this company
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

    await sql`
      UPDATE users SET company_id = NULL WHERE id = ${userId} AND company_id = ${params.id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/companies/members DELETE]", err);
    return NextResponse.json({ error: "Erro ao remover membro" }, { status: 500 });
  }
}
