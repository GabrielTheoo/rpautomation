import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sql from "@/lib/db";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") return null;
  return session;
}

// GET /api/admin/users — list all users
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rows = await sql`
      SELECT u.id, u.name, u.email, u.role, u.company, u.job_title,
             u.company_id, c.name AS company_name
      FROM users u
      LEFT JOIN companies c ON c.id = u.company_id
      ORDER BY u.name ASC
    `;
    return NextResponse.json({ users: rows });
  } catch (err) {
    console.error("[admin/users GET]", err);
    return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 });
  }
}

// PATCH /api/admin/users — toggle role for an existing user
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id, role } = await req.json();
    if (!id || !["admin", "user"].includes(role)) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    // Prevent removing own admin role
    if (id === session.user.id && role === "user") {
      return NextResponse.json({ error: "Você não pode remover seu próprio acesso de admin." }, { status: 400 });
    }
    await sql`UPDATE users SET role = ${role} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
  }
}

// POST /api/admin/users — create a new user
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { name, email, password, company, job_title, role, company_id } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
    }

    // Check if email already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const userRole = role === "admin" ? "admin" : "user";

    const result = await sql`
      INSERT INTO users (name, email, password_hash, company, job_title, role, company_id)
      VALUES (${name}, ${email}, ${hash}, ${company || null}, ${job_title || null}, ${userRole}, ${company_id || null})
      RETURNING id, name, email, role, company, job_title
    `;

    return NextResponse.json({ user: result[0] }, { status: 201 });
  } catch (err) {
    console.error("[admin/users POST]", err);
    return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
  }
}
