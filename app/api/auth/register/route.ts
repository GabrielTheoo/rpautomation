import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import sql from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { name, email, password, company, job_title, company_id } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nome, email e senha são obrigatórios." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "Esse e-mail já está cadastrado." }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await sql`
      INSERT INTO users (name, email, password_hash, company, job_title, company_id)
      VALUES (${name}, ${email}, ${hash}, ${company || null}, ${job_title || null}, ${company_id || null})
      RETURNING id, name, email, company, job_title
    `;

    return NextResponse.json({ user: result[0] }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
