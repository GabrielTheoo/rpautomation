"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Building2, Briefcase, Camera, Lock,
  LogOut, Save, Loader2, CheckCircle2, AlertCircle,
  BarChart3, FileSpreadsheet, TrendingUp, Calendar,
} from "lucide-react";
import Navbar from "@/components/Navbar";

function fmtAVE(n: number) {
  if (!n || n === 0) return "—";
  if (n >= 1_000_000_000) return `$ ${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$ ${(n / 1_000_000).toFixed(2)}M`;
  return `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

const inputCls = "w-full bg-bg border border-border rounded-xl px-4 py-2.5 pl-10 text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-primary/60 transition-colors";

export default function Perfil() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [profile, setProfile]   = useState<{
    name: string; email: string; avatar_url: string | null;
    company: string | null; job_title: string | null; created_at: string;
  } | null>(null);
  const [stats, setStats] = useState<{ total_entries: number; total_rows: number; total_ave: number } | null>(null);

  const [name, setName]         = useState("");
  const [company, setCompany]   = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [curPwd, setCurPwd]   = useState("");
  const [newPwd, setNewPwd]   = useState("");

  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState("");
  const [error, setError]       = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(data => {
        setProfile(data.user);
        setStats(data.stats);
        setName(data.user.name || "");
        setCompany(data.user.company || "");
        setJobTitle(data.user.job_title || "");
        setAvatarUrl(data.user.avatar_url || "");
      });
  }, []);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Imagem deve ter menos de 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const body: Record<string, string> = { name, company, job_title: jobTitle };
      if (avatarUrl) body.avatar_url = avatarUrl;
      if (newPwd) { body.current_password = curPwd; body.new_password = newPwd; }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao salvar."); return; }

      // Update NextAuth session
      await update({ name, company, job_title: jobTitle, picture: avatarUrl || session?.user?.image });
      setProfile(data.user);
      setSuccess("Perfil atualizado com sucesso!");
      setCurPwd(""); setNewPwd("");
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };

  const avatar = avatarUrl || session?.user?.image;
  const initials = (name || session?.user?.name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-[52px]">

        {/* Sub-header */}
        <div className="border-b border-border bg-card shadow-sm">
          <div className="w-full px-4 sm:px-6 py-4">
            <h1 className="text-lg font-bold text-text-base flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Meu Perfil
            </h1>
            <p className="text-text-muted text-sm mt-0.5">Gerencie suas informações e preferências</p>
          </div>
        </div>

        <div className="w-full px-4 sm:px-6 py-6 max-w-3xl mx-auto space-y-6">

          {/* ── Stats bar ── */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: FileSpreadsheet, label: "Processos", value: stats.total_entries, color: "text-primary" },
                { icon: BarChart3,       label: "Matérias",  value: Number(stats.total_rows).toLocaleString("pt-BR"), color: "text-primary" },
                { icon: TrendingUp,      label: "AVE Total", value: fmtAVE(Number(stats.total_ave)), color: "text-accent" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-1">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-text-muted">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Profile card ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-text-base text-sm">Informações pessoais</h2>
            </div>

            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5">

              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border flex items-center justify-center"
                    style={{ background: "rgba(74,123,30,0.08)" }}>
                    {avatar
                      ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                      : <span className="text-2xl font-bold text-primary">{initials}</span>
                    }
                  </div>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                </div>
                <div>
                  <p className="font-semibold text-text-base">{name || "—"}</p>
                  <p className="text-text-muted text-sm">{profile?.email}</p>
                  {profile?.created_at && (
                    <p className="text-text-muted text-xs mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Membro desde {fmtDate(profile.created_at)}
                    </p>
                  )}
                </div>
              </div>

              {/* Fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Nome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="email" disabled value={profile?.email || ""} className={inputCls + " opacity-50 cursor-not-allowed"} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Empresa / Cliente</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                      placeholder="Ex: Eurofarma, Agência XYZ" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Cargo</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                      placeholder="Assessor de Imprensa, Gerente…" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Change password */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Alterar senha <span className="font-normal normal-case">(opcional)</span>
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)}
                      placeholder="Senha atual" className={inputCls} />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                      placeholder="Nova senha (mín. 6 chars)" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Feedback */}
              {error   && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
              {success && <div className="flex items-center gap-2 text-accent text-sm"><CheckCircle2 className="w-4 h-4" />{success}</div>}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "#4A7B1E" }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Salvando…" : "Salvar alterações"}
                </button>
                <button type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-all bg-card">
                  <LogOut className="w-4 h-4" /> Sair da conta
                </button>
              </div>
            </form>
          </div>

          {/* ── Danger zone ── */}
          <div className="bg-card border border-red-100 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-red-500 mb-1">Sair do sistema</h3>
            <p className="text-xs text-text-muted mb-3">Encerra sua sessão em todos os dispositivos.</p>
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
              <LogOut className="w-4 h-4" /> Deslogar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
