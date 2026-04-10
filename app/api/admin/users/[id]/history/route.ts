import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sql from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") return null;
  return session;
}

// GET /api/admin/users/[id]/history — list history entries for a specific user
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rows = await sql`
      SELECT id, file_name, exported_at, row_count,
             with_impact_count, without_impact_count, total_ave, countries
      FROM history
      WHERE user_id = ${params.id}
      ORDER BY exported_at DESC
      LIMIT 50
    `;

    const history = rows.map(r => ({
      id:                  r.id,
      file_name:           r.file_name,
      exported_at:         r.exported_at,
      row_count:           r.row_count,
      with_impact_count:   r.with_impact_count,
      without_impact_count: r.without_impact_count,
      total_ave:           Number(r.total_ave),
      countries:           r.countries || [],
    }));

    return NextResponse.json({ history });
  } catch (err) {
    console.error("[admin/users/history GET]", err);
    return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 });
  }
}
