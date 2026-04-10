import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT id, file_name, exported_at, row_count,
           with_impact_count, without_impact_count, total_ave,
           countries, rows
    FROM history
    WHERE id = ${params.id} AND user_id = ${session.user.id}
    LIMIT 1
  `;

  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = rows[0];
  return NextResponse.json({
    entry: {
      id:                 r.id,
      fileName:           r.file_name,
      exportedAt:         r.exported_at,
      rowCount:           r.row_count,
      withImpactCount:    r.with_impact_count,
      withoutImpactCount: r.without_impact_count,
      totalAVE:           Number(r.total_ave),
      countries:          r.countries,
      rows:               r.rows,
    },
  });
}
