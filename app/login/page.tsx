"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, User, Building2, Briefcase, Eye, EyeOff, Loader2 } from "lucide-react";

type Tab = "login" | "register";

interface Company {
  id: string; name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab]         = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // Login fields
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [name, setName]                   = useState("");
  const [regEmail, setRegEmail]           = useState("");
  const [regPwd, setRegPwd]               = useState("");
  const [regPwdConfirm, setRegPwdConfirm] = useState("");
  const [showPwdConfirm, setShowPwdConfirm] = useState(false);
  const [companyId, setCompanyId]         = useState("");
  const [jobTitle, setJobTitle]           = useState("");

  // Companies for register
  const [companies, setCompanies]         = useState<Company[]>([]);

  useEffect(() => {
    fetch("/api/public/companies")
      .then(r => r.json())
      .then(d => setCompanies(d.companies || []))
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      setLoading(false);
      if (res?.error) setError("E-mail ou senha incorretos.");
      else router.push("/dashboard");
    } catch {
      setLoading(false);
      setError("Erro ao conectar. Tente novamente.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPwd !== regPwdConfirm) { setError("As senhas não coincidem."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: regEmail, password: regPwd, company_id: companyId || null, job_title: jobTitle }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao criar conta."); setLoading(false); return; }

      const login = await signIn("credentials", { email: regEmail, password: regPwd, redirect: false });
      setLoading(false);
      if (login?.error) { setTab("login"); setEmail(regEmail); }
      else router.push("/dashboard");
    } catch {
      setError("Erro de conexão."); setLoading(false);
    }
  };

  const inputCls = "w-full bg-white border border-border rounded-xl px-4 py-3 pl-10 text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-primary/60 transition-colors";
  const selectCls = "w-full bg-white border border-border rounded-xl px-4 py-3 pl-10 text-sm text-text-base focus:outline-none focus:border-primary/60 transition-colors appearance-none";

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(167,200,113,0.15)", border: "1px solid rgba(167,200,113,0.3)" }}>
          <Zap className="w-5 h-5" style={{ color: "#BBF261" }} />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight" style={{ color: "#1A2710" }}>
            RP<span style={{ color: "#4A7B1E" }}>Automation</span>
          </span>
          <p className="text-xs text-text-muted leading-none mt-0.5">Automação de RP</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm overflow-hidden">

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["login", "register"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? "text-primary border-b-2 border-primary bg-card"
                  : "text-text-muted hover:text-text-base"
              }`}>
              {t === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8">
          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* ── LOGIN ── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type={showPwd ? "text" : "password"} required value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputCls + " pr-10"} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "#4A7B1E" }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando…</> : "Entrar"}
              </button>
            </form>
          )}

          {/* ── REGISTER ── */}
          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="Seu nome" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)}
                    placeholder="seu@email.com" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Empresa</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none z-10" />
                    <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={selectCls}>
                      <option value="">— Selecionar —</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Cargo</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                      placeholder="Assessor, Gerente…" className={inputCls} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type={showPwd ? "text" : "password"} required minLength={6} value={regPwd}
                    onChange={e => setRegPwd(e.target.value)} placeholder="Mínimo 6 caracteres" className={inputCls + " pr-10"} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type={showPwdConfirm ? "text" : "password"}
                    required
                    value={regPwdConfirm}
                    onChange={e => setRegPwdConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    className={inputCls + " pr-10" + (regPwdConfirm && regPwd !== regPwdConfirm ? " border-red-400 focus:border-red-400" : regPwdConfirm && regPwd === regPwdConfirm ? " border-green-400 focus:border-green-400" : "")}
                  />
                  <button type="button" onClick={() => setShowPwdConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base">
                    {showPwdConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {regPwdConfirm && regPwd !== regPwdConfirm && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                )}
                {regPwdConfirm && regPwd === regPwdConfirm && (
                  <p className="text-xs text-green-500 mt-1">Senhas coincidem ✓</p>
                )}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "#4A7B1E" }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta…</> : "Criar conta"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="text-text-muted text-xs mt-6">
        RPAutomation — Sistema interno de clipping
      </p>
    </div>
  );
}
