"use client";

import { useState, useEffect, useMemo } from "react";
import {
  History, FileSpreadsheet, Download, Trash2,
  ChevronDown, ChevronUp, FileText, Loader2,
  Search, BarChart3, Globe, Calendar, ArrowUpDown, X,
  CheckCircle2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import type { ProcessedRow } from "@/lib/types";

interface HistoryEntry {
  id: string;
  fileName: string;
  exportedAt: string;
  rowCount: number;
  withImpactCount: number;
  withoutImpactCount: number;
  totalAVE: number;
  countries: string[];
  rows: ProcessedRow[];
}

function fmtAVE(n: number): string {
  if (n === 0) return "—";
  if (n >= 1_000_000_000) return `$ ${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$ ${(n / 1_000_000).toFixed(2)}M`;
  return `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Pill ────────────────────────────────────────────
function Pill({ label, value, color = "muted" }: {
  label: string; value: string | number;
  color?: "primary" | "accent" | "muted";
}) {
  const col = color === "primary" ? "text-primary" : color === "accent" ? "text-accent" : "text-text-muted";
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-bg border border-border min-w-[72px]">
      <span className={`text-sm font-bold ${col}`}>{value}</span>
      <span className="text-[11px] text-text-muted mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Clipping Entry Card ──────────────────────────────────────────────────────
function ClippingCard({ entry, onDelete }: { entry: HistoryEntry; onDelete: () => void }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: entry.rows }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `${entry.fileName.replace(/\.[^.]+$/, "")}_Re-Export.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/history?id=${entry.id}`, { method: "DELETE" });
    onDelete();
  };

  const tier1      = entry.rows.filter(r => r.Tier === "1").length;
  const positive   = entry.rows.filter(r => String(r.Sentiment || "").toLowerCase() === "positive").length;
  const neutral    = entry.rows.filter(r => String(r.Sentiment || "").toLowerCase() === "neutral").length;
  const negative   = entry.rows.filter(r => String(r.Sentiment || "").toLowerCase() === "negative").length;
  const totalReach = entry.rows.reduce((s, r) => s + (Number(r.Reach) || 0), 0);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-all hover:border-primary/30 hover:shadow-sm">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-left hover:bg-card-hover transition-colors"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(74,123,30,0.08)", border: "1px solid rgba(74,123,30,0.2)" }}>
          <FileSpreadsheet className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-base text-sm truncate">{entry.fileName}</p>
          <p className="text-text-muted text-xs mt-0.5">{fmtDate(entry.exportedAt)}</p>
        </div>

        <div className="hidden sm:flex items-center gap-1 flex-wrap max-w-[180px]">
          {entry.countries.slice(0, 3).map(c => (
            <span key={c} className="badge badge-neutral text-xs px-2 py-0.5">{c || "—"}</span>
          ))}
          {entry.countries.length > 3 && (
            <span className="text-text-muted text-xs">+{entry.countries.length - 3}</span>
          )}
        </div>

        <div className="hidden md:flex items-center gap-4 text-sm flex-shrink-0">
          <div className="text-right">
            <p className="font-bold text-primary">{entry.rowCount}</p>
            <p className="text-text-muted text-xs">matérias</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-accent">{fmtAVE(entry.totalAVE)}</p>
            <p className="text-text-muted text-xs">AVE</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-text-base">{entry.withImpactCount}</p>
            <p className="text-text-muted text-xs">c/ impacto</p>
          </div>
        </div>

        <div className="flex-shrink-0 text-text-muted ml-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 sm:px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Pill label="Matérias"    value={entry.rowCount}                         color="primary" />
            <Pill label="Com Impacto" value={entry.withImpactCount}                  color="accent"  />
            <Pill label="Sem Impacto" value={entry.withoutImpactCount}                               />
            <Pill label="Tier 1"      value={tier1}                                  color="primary" />
            <Pill label="Positivas"   value={positive}                               color="accent"  />
            <Pill label="Neutras"     value={neutral}                                                />
            <Pill label="Negativas"   value={negative}                                               />
            <Pill label="Alcance"     value={totalReach.toLocaleString("pt-BR")}     color="accent"  />
            <Pill label="AVE Total"   value={fmtAVE(entry.totalAVE)}                color="accent"  />
          </div>

          {entry.countries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.countries.map(c => (
                <span key={c} className="badge badge-neutral text-xs">{c || "—"}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "#4A7B1E" }}
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? "Baixando…" : "Baixar Novamente"}
            </button>

            <button
              onClick={() => router.push(`/historico/${entry.id}/review`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-primary text-primary hover:bg-primary/5 transition-all bg-card"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Visualizar Dados
            </button>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-text-muted border border-border hover:border-red-300 hover:text-red-400 transition-all bg-card disabled:opacity-60"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Acurácia Entry Card ──────────────────────────────────────────────────────
function AcuraciaCard({ entry, onDelete }: { entry: HistoryEntry; onDelete: () => void }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/acuracia?id=${entry.id}`, { method: "DELETE" });
    onDelete();
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-all hover:border-primary/30 hover:shadow-sm">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-left hover:bg-card-hover transition-colors"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(74,123,30,0.08)", border: "1px solid rgba(74,123,30,0.2)" }}>
          <CheckCircle2 className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-base text-sm truncate">{entry.fileName}</p>
          <p className="text-text-muted text-xs mt-0.5">{fmtDate(entry.exportedAt)}</p>
        </div>

        <div className="hidden sm:flex items-center gap-1 flex-wrap max-w-[180px]">
          {entry.countries.slice(0, 3).map(c => (
            <span key={c} className="badge badge-neutral text-xs px-2 py-0.5">{c || "—"}</span>
          ))}
          {entry.countries.length > 3 && (
            <span className="text-text-muted text-xs">+{entry.countries.length - 3}</span>
          )}
        </div>

        <div className="hidden md:flex items-center gap-4 text-sm flex-shrink-0">
          <div className="text-right">
            <p className="font-bold text-primary">{entry.rowCount}</p>
            <p className="text-text-muted text-xs">matérias</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-accent">{fmtAVE(entry.totalAVE)}</p>
            <p className="text-text-muted text-xs">AVE</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-text-base">{entry.withImpactCount}</p>
            <p className="text-text-muted text-xs">c/ impacto</p>
          </div>
        </div>

        <div className="flex-shrink-0 text-text-muted ml-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 sm:px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Pill label="Matérias"    value={entry.rowCount}         color="primary" />
            <Pill label="Com Impacto" value={entry.withImpactCount}  color="accent"  />
            <Pill label="Sem Impacto" value={entry.withoutImpactCount}               />
            <Pill label="Países"      value={entry.countries.length} color="primary" />
            <Pill label="AVE Total"   value={fmtAVE(entry.totalAVE)} color="accent"  />
          </div>

          {entry.countries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.countries.map(c => (
                <span key={c} className="badge badge-neutral text-xs">{c || "—"}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={() => router.push(`/acuracia/${entry.id}/review`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "#4A7B1E" }}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Visualizar Dashboard
            </button>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-text-muted border border-border hover:border-red-300 hover:text-red-400 transition-all bg-card disabled:opacity-60"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────
function FilterBar({
  entries, search, searchInput, setSearchInput, onSearch,
  selectedCountry, setSelectedCountry, selectedDate, setSelectedDate,
  sortOrder, setSortOrder, hasFilters, onClearFilters,
}: {
  entries: HistoryEntry[];
  search: string;
  searchInput: string;
  setSearchInput: (v: string) => void;
  onSearch: () => void;
  selectedCountry: string;
  setSelectedCountry: (v: string) => void;
  selectedDate: string;
  setSelectedDate: (v: string) => void;
  sortOrder: "newest" | "oldest";
  setSortOrder: (v: "newest" | "oldest") => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  const allCountries = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => e.countries.forEach(c => c && set.add(c)));
    return Array.from(set).sort();
  }, [entries]);

  return (
    <div className="px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nome…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSearch()}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-card text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary/50"
          />
        </div>
        <button
          onClick={onSearch}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-white flex-shrink-0"
          style={{ background: "#4A7B1E" }}
        >
          Buscar
        </button>
      </div>

      <div className="relative">
        <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
        <select
          value={selectedCountry}
          onChange={e => setSelectedCountry(e.target.value)}
          className="pl-8 pr-8 py-2 text-sm rounded-xl border border-border bg-card text-text-base focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
        >
          <option value="all">País</option>
          {allCountries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
      </div>

      <div className="relative">
        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-card text-text-base focus:outline-none focus:border-primary/50 cursor-pointer"
        />
      </div>

      <div className="relative">
        <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
        <select
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value as "newest" | "oldest")}
          className="pl-8 pr-8 py-2 text-sm rounded-xl border border-border bg-card text-text-base focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
        >
          <option value="newest">Mais Recentes</option>
          <option value="oldest">Mais Antigas</option>
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
      </div>

      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-text-muted border border-border bg-card hover:text-text-base hover:border-primary/30 transition-all"
        >
          <X className="w-3 h-3" /> Limpar filtros
        </button>
      )}
    </div>
  );
}

// ─── Shared filtered list logic ───────────────────────
function useFilteredEntries(
  entries: HistoryEntry[],
  search: string,
  selectedCountry: string,
  selectedDate: string,
  sortOrder: "newest" | "oldest",
) {
  return useMemo(() => {
    let list = [...entries];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.fileName.toLowerCase().includes(q));
    }
    if (selectedCountry !== "all") {
      list = list.filter(e => e.countries.includes(selectedCountry));
    }
    if (selectedDate) {
      list = list.filter(e => e.exportedAt.startsWith(selectedDate));
    }
    list.sort((a, b) => {
      const diff = new Date(a.exportedAt).getTime() - new Date(b.exportedAt).getTime();
      return sortOrder === "newest" ? -diff : diff;
    });
    return list;
  }, [entries, search, selectedCountry, selectedDate, sortOrder]);
}

// ─── Main Page ───────────────────────────────────────
export default function Historico() {
  const [activeTab, setActiveTab]               = useState<"clipping" | "acuracia">("clipping");

  // Clipping state
  const [clippingEntries, setClippingEntries]   = useState<HistoryEntry[]>([]);
  const [clippingLoading, setClippingLoading]   = useState(true);

  // Acurácia state
  const [acuraciaEntries, setAcuraciaEntries]   = useState<HistoryEntry[]>([]);
  const [acuraciaLoading, setAcuraciaLoading]   = useState(true);

  // Shared filter state
  const [search, setSearch]                     = useState("");
  const [searchInput, setSearchInput]           = useState("");
  const [selectedCountry, setSelectedCountry]   = useState("all");
  const [selectedDate, setSelectedDate]         = useState("");
  const [sortOrder, setSortOrder]               = useState<"newest" | "oldest">("newest");
  const [exportingAll, setExportingAll]         = useState(false);

  const fetchClipping = async () => {
    setClippingLoading(true);
    try {
      const res = await fetch("/api/history");
      if (res.ok) setClippingEntries((await res.json()).entries);
    } finally { setClippingLoading(false); }
  };

  const fetchAcuracia = async () => {
    setAcuraciaLoading(true);
    try {
      const res = await fetch("/api/acuracia");
      if (res.ok) setAcuraciaEntries((await res.json()).entries);
    } finally { setAcuraciaLoading(false); }
  };

  useEffect(() => { fetchClipping(); fetchAcuracia(); }, []);

  const resetFilters = () => {
    setSearch(""); setSearchInput(""); setSelectedCountry("all");
    setSelectedDate(""); setSortOrder("newest");
  };

  const handleTabChange = (tab: "clipping" | "acuracia") => {
    setActiveTab(tab);
    resetFilters();
  };

  const hasFilters = !!(search || selectedCountry !== "all" || selectedDate || sortOrder !== "newest");

  const entries = activeTab === "clipping" ? clippingEntries : acuraciaEntries;
  const loading = activeTab === "clipping" ? clippingLoading : acuraciaLoading;

  const filtered = useFilteredEntries(entries, search, selectedCountry, selectedDate, sortOrder);

  const handleExportAll = async () => {
    if (!filtered.length || activeTab !== "clipping") return;
    setExportingAll(true);
    try {
      const allRows = filtered.flatMap(e => e.rows);
      const res = await fetch("/api/export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: allRows }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `RPAutomation_Clipping_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally { setExportingAll(false); }
  };

  const clearAll = async () => {
    if (!confirm(`Deseja remover todo o histórico de ${activeTab === "clipping" ? "Clipping" : "Acurácias"}?`)) return;
    if (activeTab === "clipping") {
      await fetch("/api/history", { method: "DELETE" });
      setClippingEntries([]);
    } else {
      await fetch("/api/acuracia", { method: "DELETE" });
      setAcuraciaEntries([]);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-[52px]">

        {/* ── Sub-header ──────────────────────────── */}
        <div className="border-b border-border bg-card shadow-sm">
          <div className="w-full px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-lg font-bold text-text-base flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Histórico de Processos
              </h1>
              <p className="text-text-muted text-sm mt-0.5">
                {loading
                  ? "Carregando…"
                  : `${filtered.length} de ${entries.length} registro${entries.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {entries.length > 0 && (
              <div className="flex items-center gap-2">
                {activeTab === "clipping" && (
                  <button
                    onClick={handleExportAll}
                    disabled={exportingAll || !filtered.length}
                    className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: "#4A7B1E" }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {exportingAll ? "Exportando…" : "Exportar Todos"}
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-red-400 border border-border rounded-xl px-3 py-2 bg-card transition-all hover:border-red-300"
                >
                  <Trash2 className="w-3 h-3" /> Limpar Tudo
                </button>
              </div>
            )}
          </div>

          {/* ── Tabs ────────────────────────────── */}
          <div className="px-4 sm:px-6 flex gap-1">
            <button
              onClick={() => handleTabChange("clipping")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "clipping"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-base"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Clipping
              <span className="ml-1 text-xs font-normal opacity-60">{clippingEntries.length}</span>
            </button>
            <button
              onClick={() => handleTabChange("acuracia")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "acuracia"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-base"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Acurácias
              <span className="ml-1 text-xs font-normal opacity-60">{acuraciaEntries.length}</span>
            </button>
          </div>

          {/* ── Filter bar ────────────────────────── */}
          {entries.length > 0 && (
            <FilterBar
              entries={entries}
              search={search}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              onSearch={() => setSearch(searchInput)}
              selectedCountry={selectedCountry}
              setSelectedCountry={setSelectedCountry}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              hasFilters={hasFilters}
              onClearFilters={resetFilters}
            />
          )}
        </div>

        {/* ── Content ─────────────────────────────── */}
        <div className="w-full px-4 sm:px-6 py-6 max-w-5xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">Carregando histórico…</span>
            </div>

          ) : entries.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(74,123,30,0.08)", border: "1px solid rgba(74,123,30,0.15)" }}>
                <History className="w-8 h-8 text-text-muted" />
              </div>
              <p className="text-text-base font-semibold text-lg">Nenhum registro salvo</p>
              <p className="text-text-muted text-sm mt-2">
                {activeTab === "clipping"
                  ? "Os processos exportados no Clipping aparecem aqui automaticamente."
                  : "As acurácias salvas aparecem aqui."}
              </p>
              <a
                href={activeTab === "clipping" ? "/dashboard" : "/acuracia"}
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "#4A7B1E" }}>
                <FileText className="w-4 h-4" />
                {activeTab === "clipping" ? "Iniciar Clipping" : "Nova Acurácia"}
              </a>
            </div>

          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(74,123,30,0.08)", border: "1px solid rgba(74,123,30,0.15)" }}>
                <Search className="w-6 h-6 text-text-muted" />
              </div>
              <p className="text-text-base font-semibold">Nenhum resultado encontrado</p>
              <p className="text-text-muted text-sm mt-1">Tente ajustar os filtros.</p>
              <button onClick={resetFilters} className="mt-4 text-sm text-primary hover:underline">
                Limpar filtros
              </button>
            </div>

          ) : (
            <div className="space-y-3">
              {activeTab === "clipping"
                ? filtered.map(entry => (
                    <ClippingCard
                      key={entry.id}
                      entry={entry}
                      onDelete={() => setClippingEntries(prev => prev.filter(e => e.id !== entry.id))}
                    />
                  ))
                : filtered.map(entry => (
                    <AcuraciaCard
                      key={entry.id}
                      entry={entry}
                      onDelete={() => setAcuraciaEntries(prev => prev.filter(e => e.id !== entry.id))}
                    />
                  ))
              }
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
