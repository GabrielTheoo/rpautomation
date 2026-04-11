import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hookUrl = process.env.VERCEL_DEPLOY_HOOK;
  if (!hookUrl) return NextResponse.json({ error: "VERCEL_DEPLOY_HOOK not configured" }, { status: 500 });

  const res = await fetch(hookUrl, { method: "POST" });
  if (!res.ok) return NextResponse.json({ error: "Deploy failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
