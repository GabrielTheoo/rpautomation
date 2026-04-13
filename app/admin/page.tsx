"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  Users, Building2, Plus, Loader2, X, Eye, EyeOff,
  ChevronDown, ChevronRight, UserPlus, Trash2, ShieldCheck,
  FileSpreadsheet, Calendar, ArrowLeft, ShieldOff,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────
interface User {
  id: string; name: string; email: string; role: string;
  company?: string; job_title?: string;
  company_id?: string; company_name?: string;
}

interface Company {
  id: string; name: string; created_at: string; member_count: number;
}

interface HistoryEntry {
  id: string; file_name: string; exported_at: string; row_count: number;
  with_impact_count: number; without_impact_count: number;
  total_ave: number; countries: string[];
}

// ── Small helpers ────────────────────────────────────────
function Badge({ role }: { role: string }) {
  return role === "admin"
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"><ShieldCheck className="w-3 h-3" />Admin</span>
    : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-border text-text-muted">Usuário</span>;
}

function fmtAVE(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$ ${(n / 1_000_000).toFixed(2)}M`;
  return `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return iso; }
}

// ── User History Drawer ──────────────────────────────────
function UserHistoryDrawer({ user, onClose }: { user: User; onClose: () => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/users/${user.id}/history`);
        const data = await res.json();
        setHistory(data.history || []);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-md bg-bg border-l border-border flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-text-muted hover:text-text-base transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="font-semibold text-text-base text-sm">{user.name}</p>
              <p className="text-xs text-text-muted">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-base transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Histórico de arquivos exportados
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-text-muted text-sm">Nenhum arquivo exportado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-text-base text-sm truncate">{h.file_name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted mb-3">
                    <Calendar className="w-3 h-3" />
                    {fmtDate(h.exported_at)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-bg rounded-lg px-3 py-2">
                      <p className="text-text-muted">Matérias</p>
                      <p className="font-semibold text-text-base">{h.row_count}</p>
                    </div>
                    <div className="bg-bg rounded-lg px-3 py-2">
                      <p className="text-text-muted">AVE Total</p>
                      <p className="font-semibold text-text-base">{fmtAVE(h.total_ave)}</p>
                    </div>
                    <div className="bg-bg rounded-lg px-3 py-2">
                      <p className="text-text-muted">Com Impacto</p>
                      <p className="font-semibold text-primary">{h.with_impact_count}</p>
                    </div>
                    <div className="bg-bg rounded-lg px-3 py-2">
                      <p className="text-text-muted">Sem Impacto</p>
                      <p className="font-semibold text-text-muted">{h.without_impact_count}</p>
                    </div>
                  </div>
                  {h.countries?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {h.countries.map(c => (
                        <span key={c} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<"users" | "companies">("users");

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", job_title: "", role: "user", company_id: "" });
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [newUserErr, setNewUserErr] = useState("");
  const [newUserLoading, setNewUserLoading] = useState(false);

  // History drawer
  const [historyUser, setHistoryUser] = useState<User | null>(null);

  // Role toggle
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const handleToggleRole = async (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    setRoleLoading(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Erro ao atualizar."); return; }
      await loadUsers();
    } catch { alert("Erro de conexão."); }
    setRoleLoading(null);
  };

  // Companies state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyErr, setNewCompanyErr] = useState("");
  const [newCompanyLoading, setNewCompanyLoading] = useState(false);

  // Company expand & members
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [companyMembers, setCompanyMembers] = useState<Record<string, User[]>>({});
  const [assignUserId, setAssignUserId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // ── Auth guard ───────────────────────────────────────
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  // ── Load data ────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch { /* ignore */ }
    setUsersLoading(false);
  }, []);

  const loadCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    try {
      const res = await fetch("/api/admin/companies");
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch { /* ignore */ }
    setCompaniesLoading(false);
  }, []);

  useEffect(() => { loadUsers(); loadCompanies(); }, [loadUsers, loadCompanies]);

  // ── Create User ──────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserErr(""); setNewUserLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) { setNewUserErr(data.error || "Erro ao criar usuário."); setNewUserLoading(false); return; }
      setShowNewUser(false);
      setNewUser({ name: "", email: "", password: "", job_title: "", role: "user", company_id: "" });
      await loadUsers();
    } catch { setNewUserErr("Erro de conexão."); }
    setNewUserLoading(false);
  };

  // ── Create Company ───────────────────────────────────
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewCompanyErr(""); setNewCompanyLoading(true);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompanyName }),
      });
      const data = await res.json();
      if (!res.ok) { setNewCompanyErr(data.error || "Erro ao criar empresa."); setNewCompanyLoading(false); return; }
      setShowNewCompany(false); setNewCompanyName("");
      await loadCompanies();
    } catch { setNewCompanyErr("Erro de conexão."); }
    setNewCompanyLoading(false);
  };

  // ── Expand company & load members ────────────────────
  const toggleCompany = async (id: string) => {
    if (expandedCompany === id) { setExpandedCompany(null); return; }
    setExpandedCompany(id);
    if (!companyMembers[id]) {
      try {
        const res = await fetch(`/api/admin/companies/${id}/members`);
        const data = await res.json();
        setCompanyMembers(prev => ({ ...prev, [id]: data.members || [] }));
      } catch { /* ignore */ }
    }
  };

  // ── Assign user to company ────────────────────────────
  const handleAssign = async (companyId: string) => {
    if (!assignUserId) return;
    setAssignLoading(true);
    try {
      await fetch(`/api/admin/companies/${companyId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: assignUserId }),
      });
      setAssignUserId("");
      const res = await fetch(`/api/admin/companies/${companyId}/members`);
      const data = await res.json();
      setCompanyMembers(prev => ({ ...prev, [companyId]: data.members || [] }));
      await loadCompanies(); await loadUsers();
    } catch { /* ignore */ }
    setAssignLoading(false);
  };

  // ── Remove user from company ──────────────────────────
  const handleRemoveMember = async (companyId: string, userId: string) => {
    try {
      await fetch(`/api/admin/companies/${companyId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setCompanyMembers(prev => ({
        ...prev,
        [companyId]: (prev[companyId] || []).filter(u => u.id !== userId),
      }));
      await loadCompanies(); await loadUsers();
    } catch { /* ignore */ }
  };

  if (status === "loading") return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const inputCls = "w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-primary/60 transition-colors";

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-[52px]">
        {/* Header */}
        <div className="border-b border-border bg-card shadow-sm">
          <div className="w-full px-4 py-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold text-text-base" data-ek="admin-title" data-ek-label="Título da Página">Painel Administrativo</h1>
            </div>
            <p className="text-text-muted text-sm" data-ek="admin-subtitle" data-ek-label="Subtítulo da Página">Gerencie usuários e empresas do sistema</p>
          </div>
        </div>

        <div className="w-full px-4 py-6 max-w-5xl mx-auto">

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setTab("users")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === "users" ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-text-muted hover:text-text-base"
              }`}>
              <Users className="w-4 h-4" /> Usuários <span className="opacity-60 text-xs">({users.length})</span>
            </button>
            <button onClick={() => setTab("companies")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === "companies" ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-text-muted hover:text-text-base"
              }`}>
              <Building2 className="w-4 h-4" /> Empresas <span className="opacity-60 text-xs">({companies.length})</span>
            </button>
          </div>

          {/* ── USERS TAB ── */}
          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-muted uppercase tracking-wider" data-ek="users-section-label" data-ek-label="Rótulo Seção Usuários">Todos os usuários</p>
                <button onClick={() => setShowNewUser(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:opacity-90 transition-all">
                  <Plus className="w-4 h-4" /> Novo usuário
                </button>
              </div>

              {/* New user form */}
              {showNewUser && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-text-base">Criar novo usuário</p>
                    <button onClick={() => { setShowNewUser(false); setNewUserErr(""); }} className="text-text-muted hover:text-text-base"><X className="w-4 h-4" /></button>
                  </div>
                  {newUserErr && (
                    <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{newUserErr}</div>
                  )}
                  <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">Nome completo *</label>
                      <input type="text" required value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Nome" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">E-mail *</label>
                      <input type="email" required value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">Senha *</label>
                      <div className="relative">
                        <input type={showNewPwd ? "text" : "password"} required minLength={6} value={newUser.password}
                          onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                          placeholder="Mínimo 6 caracteres" className={inputCls + " pr-9"} />
                        <button type="button" onClick={() => setShowNewPwd(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base">
                          {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">Nível de acesso</label>
                      <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))} className={inputCls}>
                        <option value="user">Usuário</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">Cargo</label>
                      <input type="text" value={newUser.job_title} onChange={e => setNewUser(p => ({ ...p, job_title: e.target.value }))} placeholder="Assessor, Gerente…" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">Empresa</label>
                      <select value={newUser.company_id} onChange={e => setNewUser(p => ({ ...p, company_id: e.target.value }))} className={inputCls}>
                        <option value="">— Selecionar empresa —</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
                      <button type="button" onClick={() => { setShowNewUser(false); setNewUserErr(""); }} className="px-4 py-2 rounded-xl text-sm font-semibold border border-border text-text-muted hover:text-text-base transition-all">Cancelar</button>
                      <button type="submit" disabled={newUserLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-60 transition-all">
                        {newUserLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando…</> : <><UserPlus className="w-4 h-4" /> Criar usuário</>}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Users list */}
              {usersLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-bg">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Nome</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">E-mail</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Nível</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Empresa</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Cargo</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Histórico</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Acesso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-bg/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-text-base">{u.name}</td>
                            <td className="px-4 py-3 text-text-muted">{u.email}</td>
                            <td className="px-4 py-3"><Badge role={u.role} /></td>
                            <td className="px-4 py-3 text-text-muted">{u.company_name || u.company || "—"}</td>
                            <td className="px-4 py-3 text-text-muted">{u.job_title || "—"}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => setHistoryUser(u)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border text-text-muted hover:text-primary hover:border-primary/50 transition-all">
                                <FileSpreadsheet className="w-3.5 h-3.5" /> Ver arquivos
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              {roleLoading === u.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                              ) : u.role === "admin" ? (
                                <button
                                  onClick={() => handleToggleRole(u)}
                                  title="Remover admin"
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-all">
                                  <ShieldOff className="w-3.5 h-3.5" /> Remover admin
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleRole(u)}
                                  title="Tornar admin"
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-all">
                                  <ShieldCheck className="w-3.5 h-3.5" /> Tornar admin
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted text-sm">Nenhum usuário encontrado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── COMPANIES TAB ── */}
          {tab === "companies" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-muted uppercase tracking-wider" data-ek="companies-section-label" data-ek-label="Rótulo Seção Empresas">Empresas cadastradas</p>
                <button onClick={() => setShowNewCompany(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:opacity-90 transition-all">
                  <Plus className="w-4 h-4" /> Nova empresa
                </button>
              </div>

              {/* New company form */}
              {showNewCompany && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-text-base">Cadastrar empresa</p>
                    <button onClick={() => { setShowNewCompany(false); setNewCompanyErr(""); }} className="text-text-muted hover:text-text-base"><X className="w-4 h-4" /></button>
                  </div>
                  {newCompanyErr && (
                    <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{newCompanyErr}</div>
                  )}
                  <form onSubmit={handleCreateCompany} className="flex gap-3">
                    <input type="text" required value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)}
                      placeholder="Nome da empresa ou agência" className={inputCls} />
                    <button type="submit" disabled={newCompanyLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-60 transition-all whitespace-nowrap">
                      {newCompanyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Cadastrar
                    </button>
                  </form>
                </div>
              )}

              {/* Companies list */}
              {companiesLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-3">
                  {companies.map((c) => (
                    <div key={c.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                      <button onClick={() => toggleCompany(c.id)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="text-left">
                            <p className="font-semibold text-text-base">{c.name}</p>
                            <p className="text-xs text-text-muted">{c.member_count} {c.member_count === 1 ? "membro" : "membros"}</p>
                          </div>
                        </div>
                        {expandedCompany === c.id
                          ? <ChevronDown className="w-4 h-4 text-text-muted" />
                          : <ChevronRight className="w-4 h-4 text-text-muted" />}
                      </button>

                      {expandedCompany === c.id && (
                        <div className="border-t border-border px-5 py-4">
                          {/* Members list */}
                          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Membros</p>
                          {(companyMembers[c.id] || []).length === 0 ? (
                            <p className="text-sm text-text-muted mb-3">Nenhum membro ainda.</p>
                          ) : (
                            <div className="space-y-2 mb-4">
                              {(companyMembers[c.id] || []).map((u) => (
                                <div key={u.id} className="flex items-center justify-between bg-bg border border-border rounded-xl px-3 py-2">
                                  <button className="flex-1 text-left" onClick={() => setHistoryUser(u)}>
                                    <p className="text-sm font-medium text-text-base hover:text-primary transition-colors">{u.name}</p>
                                    <p className="text-xs text-text-muted">{u.email}{u.job_title ? ` · ${u.job_title}` : ""}</p>
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => setHistoryUser(u)}
                                      className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                      title="Ver histórico">
                                      <FileSpreadsheet className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleRemoveMember(c.id, u.id)}
                                      className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Assign user */}
                          <div className="flex gap-2">
                            <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)}
                              className="flex-1 bg-white border border-border rounded-xl px-3 py-2 text-sm text-text-base focus:outline-none focus:border-primary/60 transition-colors">
                              <option value="">— Selecionar usuário para adicionar —</option>
                              {users.filter(u => u.company_id !== c.id).map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                              ))}
                            </select>
                            <button onClick={() => handleAssign(c.id)} disabled={!assignUserId || assignLoading}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-all">
                              {assignLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                              Adicionar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {companies.length === 0 && (
                    <div className="bg-card border border-border rounded-2xl px-5 py-10 text-center">
                      <Building2 className="w-8 h-8 text-text-muted mx-auto mb-2" />
                      <p className="text-text-muted text-sm">Nenhuma empresa cadastrada ainda.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* User History Drawer */}
      {historyUser && (
        <UserHistoryDrawer user={historyUser} onClose={() => setHistoryUser(null)} />
      )}
    </div>
  );
}
