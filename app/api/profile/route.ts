import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import sql from "@/lib/db";

// GET — current user profile + stats
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await sql`
    SELECT id, name, email, avatar_url, company, job_title, created_at FROM users WHERE id = ${session.user.id}
  `;
  const user = users[0];
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = await sql`
    SELECT COUNT(*) as total_entries,
           COALESCE(SUM(row_count), 0) as total_rows,
           COALESCE(SUM(total_ave), 0) as total_ave
    FROM history WHERE user_id = ${session.user.id}
  `;

  return NextResponse.json({ user, stats: stats[0] });
}

// PATCH — update profile fields
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, company, job_title, avatar_url, current_password, new_password } = body;

  // If changing password, verify current first
  if (new_password) {
    if (!current_password) {
      return NextResponse.json({ error: "Informe a senha atual." }, { status: 400 });
    }
    if (new_password.length < 6) {
      return NextResponse.json({ error: "Nova senha deve ter ao menos 6 caracteres." }, { status: 400 });
    }
    const rows = await sql`SELECT password_hash FROM users WHERE id = ${session.user.id}`;
    const valid = await bcrypt.compare(current_password, rows[0].password_hash as string);
    if (!valid) return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });

    const newHash = await bcrypt.hash(new_password, 12);
    await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${session.user.id}`;
  }

  // Update profile fields
  await sql`
    UPDATE users SET
      name       = COALESCE(${name ?? null},       name),
      company    = COALESCE(${company ?? null},    company),
      job_title  = COALESCE(${job_title ?? null},  job_title),
      avatar_url = COALESCE(${avatar_url ?? null}, avatar_url),
      updated_at = NOW()
    WHERE id = ${session.user.id}
  `;

  const updated = await sql`
    SELECT id, name, email, avatar_url, company, job_title FROM users WHERE id = ${session.user.id}
  `;

  return NextResponse.json({ user: updated[0] });
}
