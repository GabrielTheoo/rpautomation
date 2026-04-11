import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sql from "@/lib/db";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS page_overrides (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      page_key TEXT NOT NULL,
      element_key TEXT NOT NULL,
      text_content TEXT,
      text_color TEXT,
      bg_color TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(page_key, element_key)
    )
  `;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const rows = await sql`SELECT * FROM page_overrides ORDER BY updated_at DESC`;
  return NextResponse.json({ overrides: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const { page_key, element_key, text_content, text_color, bg_color } = await req.json();
  await sql`
    INSERT INTO page_overrides (page_key, element_key, text_content, text_color, bg_color)
    VALUES (${page_key}, ${element_key}, ${text_content ?? null}, ${text_color ?? null}, ${bg_color ?? null})
    ON CONFLICT (page_key, element_key) DO UPDATE SET
      text_content = EXCLUDED.text_content,
      text_color = EXCLUDED.text_color,
      bg_color = EXCLUDED.bg_color,
      updated_at = NOW()
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const { page_key, element_key } = await req.json();
  await sql`DELETE FROM page_overrides WHERE page_key = ${page_key} AND element_key = ${element_key}`;
  return NextResponse.json({ ok: true });
}
