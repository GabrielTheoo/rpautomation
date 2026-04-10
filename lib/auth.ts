import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import sql from "./db";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",  type: "email"    },
        password: { label: "Senha",  type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          type UserRow = {
            id: string; email: string; name: string; password_hash: string | null;
            avatar_url: string | null; company: string | null; job_title: string | null;
            role?: string;
          };

          let user: UserRow | undefined;
          try {
            const rows = await sql`
              SELECT id, email, name, password_hash, avatar_url, company, job_title, role
              FROM users WHERE email = ${credentials.email}
            `;
            user = rows[0] as UserRow | undefined;
          } catch {
            // Fallback: role column may not exist yet
            const rows = await sql`
              SELECT id, email, name, password_hash, avatar_url, company, job_title
              FROM users WHERE email = ${credentials.email}
            `;
            user = rows[0] as UserRow | undefined;
          }

          if (!user || !user.password_hash) return null;
          const valid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!valid) return null;

          return {
            id:        user.id,
            email:     user.email,
            name:      user.name,
            image:     user.avatar_url ?? undefined,
            company:   user.company   ?? undefined,
            job_title: user.job_title ?? undefined,
            role:      user.role      ?? "user",
          };
        } catch (err) {
          console.error("[authorize] error:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // ── Credentials sign-in ──
      if (account?.provider === "credentials" && user) {
        token.id        = user.id!;
        token.company   = (user as { company?: string }).company;
        token.job_title = (user as { job_title?: string }).job_title;
        token.picture   = user.image;
        token.role      = (user as { role?: string }).role ?? "user";
      }

      // ── Session update (profile save) ──
      if (trigger === "update" && session) {
        if (session.name)      token.name      = session.name;
        if (session.company   !== undefined) token.company   = session.company;
        if (session.job_title !== undefined) token.job_title = session.job_title;
        if (session.picture   !== undefined) token.picture   = session.picture;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id        = token.id as string;
      session.user.company   = token.company as string | undefined;
      session.user.job_title = token.job_title as string | undefined;
      session.user.image     = token.picture as string | undefined;
      session.user.role      = token.role as string | undefined;
      return session;
    },
  },

  pages:   { signIn: "/login" },
  session: { strategy: "jwt" },
};

// ── NextAuth type extensions ──────────────────────────
declare module "next-auth" {
  interface User { company?: string; job_title?: string; role?: string; }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      company?: string;
      job_title?: string;
      role?: string;
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT { id: string; company?: string; job_title?: string; role?: string; }
}
