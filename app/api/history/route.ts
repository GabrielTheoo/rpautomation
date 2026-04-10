import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sql from "@/lib/db";

// GET — list user's history
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT id, file_name, exported_at, row_count,
           with_impact_count, without_impact_count, total_ave,
           countries, rows, created_at
    FROM history
    WHERE user_id = ${session.user.id}
      AND source_type = 'clipping'
    ORDER BY created_at DESC
    LIMIT 50
  `;

  const entries = rows.map((r) => ({
    id:                 r.id,
    fileName:           r.file_name,
    exportedAt:         r.exported_at,
    rowCount:           r.row_count,
    withImpactCount:    r.with_impact_count,
    withoutImpactCount: r.without_impact_count,
    totalAVE:           Number(r.total_ave),
    countries:          r.countries,
    rows:               r.rows,
  }));

  return NextResponse.json({ entries });
}

// POST — save new entry
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { fileName, exportedAt, rowCount, withImpactCount, withoutImpactCount, totalAVE, countries, rows } = body;

  await sql`
    INSERT INTO history
      (user_id, file_name, exported_at, row_count, with_impact_count, without_impact_count, total_ave, countries, rows)
    VALUES
      (${session.user.id}, ${fileName}, ${exportedAt}, ${rowCount},
       ${withImpactCount}, ${withoutImpactCount}, ${totalAVE}, ${countries}, ${JSON.stringify(rows)})
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE — remove one or all entries
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    await sql`DELETE FROM history WHERE id = ${id} AND user_id = ${session.user.id}`;
  } else {
    await sql`DELETE FROM history WHERE user_id = ${session.user.id}`;
  }

  return NextResponse.json({ ok: true });
}
