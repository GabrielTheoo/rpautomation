import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sql from "@/lib/db";
import { parseMultiSheetSpreadsheet } from "@/lib/spreadsheet";

// GET — list user's acurácia history
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT id, file_name, exported_at, row_count,
           with_impact_count, without_impact_count, total_ave,
           countries, rows, created_at
    FROM history
    WHERE user_id = ${session.user.id}
      AND source_type = 'acuracia'
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

// POST — parse xlsx (multipart) OR save an acurácia entry (json)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";

  // ── Parse mode: multipart form with xlsx file ──
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      const buffer = await file.arrayBuffer();
      const rows = parseMultiSheetSpreadsheet(buffer);

      if (rows.length === 0) {
        return NextResponse.json({ error: "Nenhuma linha encontrada na planilha." }, { status: 400 });
      }

      return NextResponse.json({ rows, fileName: file.name, total: rows.length });
    } catch (err) {
      console.error("Acurácia parse error:", err);
      return NextResponse.json({ error: "Erro ao processar planilha." }, { status: 500 });
    }
  }

  // ── Save mode: JSON body with processed data ──
  try {
    const body = await req.json();
    const {
      fileName, exportedAt, rowCount,
      withImpactCount, withoutImpactCount,
      totalAVE, countries, rows,
    } = body;

    await sql`
      INSERT INTO history
        (user_id, file_name, exported_at, row_count, with_impact_count,
         without_impact_count, total_ave, countries, rows, source_type)
      VALUES
        (${session.user.id}, ${fileName}, ${exportedAt}, ${rowCount},
         ${withImpactCount}, ${withoutImpactCount}, ${totalAVE},
         ${countries}, ${JSON.stringify(rows)}, 'acuracia')
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Acurácia save error:", err);
    return NextResponse.json({ error: "Erro ao salvar." }, { status: 500 });
  }
}

// DELETE — remove one or all acurácia entries
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    await sql`
      DELETE FROM history
      WHERE id = ${id} AND user_id = ${session.user.id} AND source_type = 'acuracia'
    `;
  } else {
    await sql`
      DELETE FROM history
      WHERE user_id = ${session.user.id} AND source_type = 'acuracia'
    `;
  }

  return NextResponse.json({ ok: true });
}
