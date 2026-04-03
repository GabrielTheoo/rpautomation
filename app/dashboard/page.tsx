"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileSpreadsheet, CheckCircle2, Loader2,
  Download, AlertTriangle, RefreshCw, Zap, TrendingUp,
  Globe, FileText, Search, BarChart3,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import StepIndicator from "@/components/StepIndicator";
import DataTable from "@/components/DataTable";
import type { ProcessedRow, TierEntry, WizardStep } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────
function isBrazilStr(country: string | number | undefined): boolean {
  const c = String(country || "").toLowerCase().trim();
  return c.includes("brazil") || c.includes("brasil");
}

function fmtAVE(val: string | number | undefined | null) {
  const n = parseFloat(String(val ?? "").replace(/[$,\s]/g, "")) || 0;
  if (!val || n === 0) return { display: "—", full: "—", short: false };
  const full = `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 1_000_000_000) return { display: `$ ${(n / 1_000_000_000).toFixed(2)}B`, full, short: true };
  if (n >= 1_000_000)     return { display: `$ ${(n / 1_000_000).toFixed(2)}M`, full, short: true };
  return { display: full, full, short: false };
}

// ─── Country Tabs ─────────────────────────────────────
function CountryTabs({ countries, active, onSelect, rows }: {
  countries: string[]; active: string;
  onSelect: (c: string) => void; rows: ProcessedRow[];
}) {
  if (countries.length <= 1) return null;
  return (
    <div className="flex gap-1.5 flex-wrap mb-3">
      <button onClick={() => onSelect("all")}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          active === "all"
            ? "bg-primary text-white shadow-sm"
            : "bg-card border border-border text-text-muted hover:border-primary/50 hover:text-text-base"
        }`}>
        Todos <span className="ml-1 opacity-60">{rows.length}</span>
      </button>
      {countries.map((c) => {
        const count = rows.filter((r) => String(r.Country || "") === c).length;
        return (
          <button key={c} onClick={() => onSelect(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              active === c ? "bg-primary text-white shadow-sm"
              : isBrazilStr(c) ? "bg-card border-2 border-primary/40 text-primary hover:border-primary"
              : "bg-card border border-border text-text-muted hover:border-primary/50 hover:text-text-base"
            }`}>
            {c || "—"} <span className="ml-1 opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────
interface StatCardProps {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color?: "primary" | "accent" | "muted";
  tooltip: string; valueTitle?: string;
}

function StatCard({ icon: Icon, label, value, sub, color = "primary", tooltip, valueTitle }: StatCardProps) {
  const colorCls = color === "accent" ? "text-accent" : color === "muted" ? "text-text-muted" : "text-primary";
  return (
    <div className="tooltip-wrapper">
      <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 cursor-default hover:border-primary/50 transition-colors">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(74,123,30,0.08)" }}>
          <Icon className={`w-4 h-4 ${colorCls}`} />
        </div>
        <div className="min-w-0">
          <p className="text-text-muted text-xs">{label}</p>
          <p className={`text-xl font-bold mt-0.5 ${colorCls} truncate`}
            title={valueTitle || undefined}>{value}</p>
          {sub && <p className="text-text-muted text-[11px] mt-0.5">{sub}</p>}
        </div>
      </div>
      <div className="tooltip-box">{tooltip}{valueTitle && <><br /><span className="opacity-80 text-[11px]">{valueTitle}</span></>}</div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────
function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-text-muted mb-1">
        <span>{label || "Verificando impacto nos links… acessa cada URL e conta menções à Eurofarma"}</span>
        <span className="font-medium">{value}/{max} ({pct}%)</span>
      </div>
      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #4A7B1E, #5EA818)" }} />
      </div>
    </div>
  );
}

// ─── Review Charts ────────────────────────────────────
function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-xs font-semibold text-text-base">
          {value} <span className="text-text-muted font-normal">({max > 0 ? Math.round(pct) : 0}%)</span>
        </span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, minWidth: value > 0 ? "6px" : "0" }} />
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function ReviewSection({ rows }: { rows: ProcessedRow[] }) {
  const n = rows.length;
  const totalAVE   = rows.reduce((s, r) => s + (parseFloat(String(r.AVE ?? "").replace(/[$,\s]/g, "")) || 0), 0);
  const totalReach = rows.reduce((s, r) => s + (Number(r.Reach) || 0), 0);
  const uniqSrc    = new Set(rows.map(r => r.Source)).size;

  const tier1    = rows.filter(r => r.Tier === "1");
  const tier2    = rows.filter(r => r.Tier === "2");
  const tier3    = rows.filter(r => r.Tier === "3");
  const tierNone = rows.filter(r => !r.Tier);
  const aveTier1   = tier1.reduce((s, r) => s + (parseFloat(String(r.AVE ?? "").replace(/[$,\s]/g, "")) || 0), 0);
  const reachTier1 = tier1.reduce((s, r) => s + (Number(r.Reach) || 0), 0);
  const tier1Pos   = tier1.filter(r => String(r.Sentiment || "").toLowerCase() === "positive").length;

  const positive  = rows.filter(r => String(r.Sentiment || "").toLowerCase() === "positive").length;
  const neutral   = rows.filter(r => String(r.Sentiment || "").toLowerCase() === "neutral").length;
  const negative  = rows.filter(r => String(r.Sentiment || "").toLowerCase() === "negative").length;

  const withImpact    = rows.filter(r => r["With Impact or Without Impact"] === "With Impact").length;
  const withoutImpact = rows.filter(r => r["With Impact or Without Impact"] === "Without Impact").length;
  const impactTier1   = tier1.filter(r => r["With Impact or Without Impact"] === "With Impact").length;

  const aveFmt     = fmtAVE(totalAVE);
  const aveTier1Fmt = fmtAVE(aveTier1);

  return (
    <div className="space-y-5">
      {/* KPIs Gerais */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">KPIs Gerais</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={FileText} label="Total de Notícias" value={n} color="primary"
            tooltip="Total de matérias no período selecionado." />
          <StatCard icon={Globe} label="Fontes Únicas" value={uniqSrc}
            tooltip="Quantidade de veículos/fontes distintos." />
          <StatCard icon={TrendingUp} label="Alcance Total" color="accent"
            value={totalReach.toLocaleString("pt-BR")}
            tooltip="Soma do Reach de todas as matérias." />
          <StatCard icon={Zap} label="AVE Total" color="accent"
            value={aveFmt.display}
            valueTitle={aveFmt.short ? aveFmt.full : undefined}
            tooltip="Advertising Value Equivalency — soma de AVE de todas as matérias." />
        </div>
      </div>

      {/* KPIs Tier 1 */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">KPIs Tier 1</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Zap} label="AVE Tier 1" color="accent"
            value={aveTier1Fmt.display}
            valueTitle={aveTier1Fmt.short ? aveTier1Fmt.full : undefined}
            tooltip="Soma de AVE apenas das matérias classificadas como Tier 1." />
          <StatCard icon={TrendingUp} label="Reach Tier 1" color="accent"
            value={reachTier1.toLocaleString("pt-BR")}
            tooltip="Soma de Reach das matérias Tier 1." />
          <StatCard icon={FileText} label="Tier 1 Positivas" value={tier1Pos} color="primary"
            tooltip="Matérias Tier 1 com sentimento Positivo." />
          <StatCard icon={CheckCircle2} label="Com Impacto (T1)" value={impactTier1} color="primary"
            tooltip="Matérias Tier 1 classificadas como Com Impacto." />
        </div>
      </div>

      {/* KPIs Sentimento & Impacto */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Sentimento & Impacto</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={FileText} label="Matérias Positivas" value={positive} color="accent"
            tooltip="Total de matérias com sentimento Positivo." />
          <StatCard icon={FileText} label="Matérias Neutras" value={neutral} color="muted"
            tooltip="Total de matérias com sentimento Neutro." />
          <StatCard icon={CheckCircle2} label="Com Impacto" value={withImpact} color="primary"
            tooltip="Matérias onde Eurofarma é citada 2+ vezes ou está no título." />
          <StatCard icon={FileText} label="Sem Impacto" value={withoutImpact} color="muted"
            tooltip="Matérias onde Eurofarma tem menos de 2 menções e não está no título." />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Distribuição de Sentimento">
          <HBar label="Positivo"  value={positive}  max={n} color="#4A7B1E" />
          <HBar label="Neutro"    value={neutral}   max={n} color="#9CA3AF" />
          <HBar label="Negativo"  value={negative}  max={n} color="#EF4444" />
          {n - positive - neutral - negative > 0 && (
            <HBar label="Não definido" value={n - positive - neutral - negative} max={n} color="#E5E7EB" />
          )}
        </ChartCard>

        <ChartCard title="Distribuição de Impacto">
          <HBar label="Com Impacto"  value={withImpact}    max={n} color="#5EA818" />
          <HBar label="Sem Impacto"  value={withoutImpact} max={n} color="#D1D5DB" />
          {n - withImpact - withoutImpact > 0 && (
            <HBar label="Não verificado" value={n - withImpact - withoutImpact} max={n} color="#F3F4F6" />
          )}
        </ChartCard>

        <ChartCard title="Distribuição de Tier">
          <HBar label="Tier 1"    value={tier1.length}    max={n} color="#3A7015" />
          <HBar label="Tier 2"    value={tier2.length}    max={n} color="#5EA818" />
          <HBar label="Tier 3"    value={tier3.length}    max={n} color="#A8D880" />
          <HBar label="Sem Tier"  value={tierNone.length} max={n} color="#E5E7EB" />
        </ChartCard>
      </div>
    </div>
  );
}

// ─── Button styles ────────────────────────────────────
const btnPrimary   = "flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90";
const btnSecondary = "flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-text-muted hover:text-text-base hover:border-primary/50 text-sm transition-all bg-card";

// ─── Dashboard ────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [mode, setMode] = useState<"" | "clipping">("");
  const [step, setStep] = useState<WizardStep>(1);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [rows, setRows] = useState<ProcessedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [impactProgress, setImpactProgress] = useState(0);
  const [impactTotal, setImpactTotal] = useState(0);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [tierEntries, setTierEntries] = useState<TierEntry[]>([]);
  const [activeCountry, setActiveCountry] = useState<string>("all");

  useEffect(() => {
    const saved = localStorage.getItem("rpautomation_tiers");
    if (saved) { try { setTierEntries(JSON.parse(saved)); } catch { /* ignore */ } }
  }, []);

  // Unique countries sorted: Brazil first, then alphabetical
  const countries = useMemo(() => {
    const seen = new Set<string>(); const list: string[] = [];
    for (const row of rows) {
      const c = String(row.Country || "");
      if (!seen.has(c)) { seen.add(c); list.push(c); }
    }
    return list.sort((a, b) => {
      if (isBrazilStr(a) && !isBrazilStr(b)) return -1;
      if (!isBrazilStr(a) && isBrazilStr(b)) return 1;
      return a.localeCompare(b, "pt-BR");
    });
  }, [rows]);

  const filteredWithIdx = useMemo(() =>
    rows.map((row, idx) => ({ row, idx }))
      .filter(({ row }) => activeCountry === "all" || String(row.Country || "") === activeCountry),
    [rows, activeCountry]
  );

  const displayRows = useMemo(() => filteredWithIdx.map((x) => x.row), [filteredWithIdx]);

  // ── Stats computed from displayRows (respects country filter) ──
  const totalAVE    = useMemo(() => displayRows.reduce((s, r) => s + (parseFloat(String(r.AVE ?? "").replace(/[$,\s]/g, "")) || 0), 0), [displayRows]);
  const totalReach  = useMemo(() => displayRows.reduce((s, r) => s + (Number(r.Reach) || 0), 0), [displayRows]);
  const uniqueSrc   = useMemo(() => new Set(displayRows.map(r => r.Source)).size, [displayRows]);
  const withImpact  = useMemo(() => displayRows.filter(r => r["With Impact or Without Impact"] === "With Impact").length, [displayRows]);
  const withoutImpact = useMemo(() => displayRows.filter(r => r["With Impact or Without Impact"] === "Without Impact").length, [displayRows]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]; if (!file) return;
    setUploadError(""); setFileName(file.name); setFileSize(file.size);
    setIsProcessing(true); setActiveCountry("all");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tierEntries", JSON.stringify(tierEntries));
      const res = await fetch("/api/process", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Erro ao processar arquivo");
      const data = await res.json();
      setRows(data.rows); setStep(2);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally { setIsProcessing(false); }
  }, [tierEntries]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/tab-separated-values": [".tsv"],
    },
    multiple: false, disabled: isProcessing,
  });

  const checkAllImpact = async () => {
    const brazilCount = rows.filter((r) => isBrazilStr(r.Country)).length;
    setIsCheckingImpact(true); setImpactProgress(0); setImpactTotal(brazilCount);
    setRows((prev) => prev.map((r) =>
      isBrazilStr(r.Country) ? { ...r, "With Impact or Without Impact": "Checking..." } : r
    ));
    const batchSize = 5;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await Promise.all(batch.map(async (row, bIdx) => {
        const globalIdx = i + bIdx;
        if (!isBrazilStr(row.Country)) return;
        try {
          const res = await fetch("/api/check-impact", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: row.URL }),
          });
          const data = await res.json();
          setRows((prev) => { const u = [...prev]; u[globalIdx] = { ...u[globalIdx], "With Impact or Without Impact": data.impact }; return u; });
        } catch {
          setRows((prev) => { const u = [...prev]; u[globalIdx] = { ...u[globalIdx], "With Impact or Without Impact": "Error" }; return u; });
        }
        setImpactProgress((p) => p + 1);
      }));
    }
    setIsCheckingImpact(false);
  };

  const handleProactiveChange = (i: number, v: "Proactive" | "Spontaneous") =>
    setRows((prev) => { const u = [...prev]; u[i] = { ...u[i], "Proactive or Spontaneous": v }; return u; });
  const handleTierChange = (i: number, v: "1" | "2" | "3" | "") =>
    setRows((prev) => { const u = [...prev]; u[i] = { ...u[i], Tier: v }; return u; });
  const handleImpactChange = (i: number, v: "With Impact" | "Without Impact" | "") =>
    setRows((prev) => { const u = [...prev]; u[i] = { ...u[i], "With Impact or Without Impact": v }; return u; });
  const handleSentimentChange = (i: number, v: string) =>
    setRows((prev) => { const u = [...prev]; u[i] = { ...u[i], Sentiment: v }; return u; });

  const handleProactiveFiltered = (fi: number, v: "Proactive" | "Spontaneous") => handleProactiveChange(filteredWithIdx[fi].idx, v);
  const handleTierFiltered      = (fi: number, v: "1" | "2" | "3" | "")        => handleTierChange(filteredWithIdx[fi].idx, v);
  const handleImpactFiltered    = (fi: number, v: "With Impact" | "Without Impact" | "") => handleImpactChange(filteredWithIdx[fi].idx, v);
  const handleSentimentFiltered = (fi: number, v: string)                       => handleSentimentChange(filteredWithIdx[fi].idx, v);

  const handleExport = async () => {
    const res = await fetch("/api/export", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RPAutomation_Export_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetWizard = () => {
    setMode(""); setStep(1); setRows([]); setFileName(""); setFileSize(0);
    setUploadError(""); setImpactProgress(0); setImpactTotal(0);
    setIsCheckingImpact(false); setActiveCountry("all");
  };

  const aveFmt = fmtAVE(totalAVE);

  // ══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-[52px]">

        {/* Sub-header */}
        <div className="border-b border-border bg-card shadow-sm">
          <div className="w-full px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-base font-bold text-text-base">Automação de RP</h1>
              <p className="text-text-muted text-xs mt-0.5">
                Importe, processe e exporte seus relatórios de clipping
              </p>
            </div>
            {mode === "clipping" && (
              <StepIndicator currentStep={step} onStepClick={(s) => s < step && setStep(s)} />
            )}
          </div>
        </div>

        <div className="w-full px-4 py-6">

          {/* ══ MODE SELECTION ═════════════════════════ */}
          {mode === "" && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-text-base">O que você deseja fazer?</h2>
                <p className="text-text-muted text-sm mt-1">
                  Escolha uma das opções abaixo para começar
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Clipping */}
                <button
                  onClick={() => setMode("clipping")}
                  className="group relative flex flex-col items-start gap-4 p-6 bg-card border-2 border-border rounded-2xl text-left hover:border-primary/60 hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(74,123,30,0.1)", border: "1px solid rgba(74,123,30,0.25)" }}>
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-base group-hover:text-primary transition-colors">
                      Clipping
                    </h3>
                    <p className="text-text-muted text-sm mt-1 leading-relaxed">
                      Importe uma planilha de clipping, preencha Tier, Impacto e Proativo automaticamente e exporte o resultado.
                    </p>
                  </div>
                  <span className="text-xs text-primary font-semibold mt-auto">
                    Iniciar →
                  </span>
                </button>

                {/* Pesquisa */}
                <button
                  onClick={() => router.push("/pesquisa")}
                  className="group relative flex flex-col items-start gap-4 p-6 bg-card border-2 border-border rounded-2xl text-left hover:border-primary/60 hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(94,168,24,0.1)", border: "1px solid rgba(94,168,24,0.25)" }}>
                    <Search className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-base group-hover:text-accent transition-colors">
                      Pesquisa
                    </h3>
                    <p className="text-text-muted text-sm mt-1 leading-relaxed">
                      Carregue uma planilha e pesquise qualquer palavra ou frase diretamente no conteúdo de cada matéria.
                    </p>
                  </div>
                  <span className="text-xs text-accent font-semibold mt-auto">
                    Iniciar →
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 1 — UPLOAD ═══════════════════════ */}
          {mode === "clipping" && step === 1 && (
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(74,123,30,0.1)", border: "1px solid rgba(74,123,30,0.25)" }}>
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-text-base">Inserir Planilha</h2>
                <p className="text-text-muted text-sm mt-1">
                  Upload do CSV ou XLSX exportado do seu sistema de monitoramento
                </p>
              </div>

              <div {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragActive ? "border-accent bg-green-50" :
                  isProcessing ? "border-border opacity-60 cursor-not-allowed" :
                  "border-border hover:border-primary/60 hover:bg-card"
                }`}>
                <input {...getInputProps()} />
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-9 h-9 text-primary animate-spin" />
                    <p className="text-text-muted text-sm">Processando arquivo…</p>
                  </div>
                ) : isDragActive ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileSpreadsheet className="w-9 h-9 text-accent" />
                    <p className="text-accent font-medium">Solte o arquivo aqui</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <FileSpreadsheet className="w-9 h-9 text-text-muted" />
                    <div>
                      <p className="text-text-base font-medium text-sm">
                        Arraste ou <span className="text-primary underline cursor-pointer">clique para selecionar</span>
                      </p>
                      <p className="text-text-muted text-xs mt-1">CSV, XLSX ou XLS</p>
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 p-3 rounded-xl flex items-center gap-3"
                  style={{ background: "#FDECEC", border: "1px solid #F5B8B8" }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#C0392B" }} />
                  <p className="text-sm" style={{ color: "#C0392B" }}>{uploadError}</p>
                </div>
              )}

              <div className="mt-5 p-4 rounded-xl bg-card border border-border">
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Campos mantidos</p>
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {["Date","Headline","URL","Source","Country","Reach","AVE","Sentiment"].map((col) => (
                    <div key={col} className="rounded-lg px-2 py-1.5 text-center"
                      style={{ background: "#F0F5EE", border: "1px solid #DDE8D8" }}>
                      <span className="text-primary text-xs font-medium">{col}</span>
                    </div>
                  ))}
                </div>
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Campos adicionados</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {["Proactive or Spontaneous","With Impact or Without Impact","Tier"].map((col) => (
                    <div key={col} className="rounded-lg px-2 py-1.5 text-center"
                      style={{ background: "#F0F8E8", border: "1px solid #B8D890" }}>
                      <span className="text-xs font-medium" style={{ color: "#4A7B1E" }}>{col}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => setMode("")}
                className="mt-4 w-full text-xs text-text-muted hover:text-primary text-center transition-colors">
                ← Voltar à seleção
              </button>
            </div>
          )}

          {/* ══ STEP 2 — PREVIEW ══════════════════════ */}
          {mode === "clipping" && step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> Pré-visualização — Dados Limpos
                  </h2>
                  <p className="text-text-muted text-xs mt-0.5">
                    <span className="font-medium text-primary">{fileName}</span> •{" "}
                    {rows.length} registros • {(fileSize / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={resetWizard} className={btnSecondary}>
                    <RefreshCw className="w-3.5 h-3.5" /> Novo arquivo
                  </button>
                  <button onClick={() => setStep(3)} className={btnPrimary} style={{ background: "#4A7B1E" }}>
                    Avançar <Zap className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatCard icon={FileText} label="Total de Notícias" value={displayRows.length} color="primary"
                  tooltip="Número total de notícias importadas (filtrado por país selecionado)." />
                <StatCard icon={Globe} label="Fontes Únicas" value={uniqueSrc}
                  tooltip="Quantidade de veículos/fontes distintos no país selecionado." />
                <StatCard icon={TrendingUp} label="Alcance Total"
                  value={totalReach.toLocaleString("pt-BR")}
                  tooltip="Soma do Reach de todas as notícias no país selecionado." />
                <StatCard icon={Zap} label="AVE Total" color="accent"
                  value={aveFmt.display}
                  valueTitle={aveFmt.short ? aveFmt.full : undefined}
                  tooltip="Advertising Value Equivalency — valor estimado em dólares." />
              </div>

              <CountryTabs countries={countries} active={activeCountry} onSelect={setActiveCountry} rows={rows} />
              <DataTable rows={displayRows} showProcessedColumns={false} onSentimentChange={handleSentimentFiltered} />
            </div>
          )}

          {/* ══ STEP 3 — PROCESSING ═══════════════════ */}
          {mode === "clipping" && step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-text-base">Processamento Inteligente</h2>
                  <p className="text-text-muted text-xs mt-0.5">
                    Tier auto-preenchido por URL • Impacto verificado via leitura da notícia • Proativo/Espontâneo manual
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isCheckingImpact && (
                    <button onClick={checkAllImpact} className={btnSecondary}>
                      <RefreshCw className="w-3.5 h-3.5" /> Verificar Impacto
                    </button>
                  )}
                  <button onClick={() => setStep(4)} className={btnPrimary} style={{ background: "#4A7B1E" }}>
                    Review <BarChart3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isCheckingImpact && (
                <div className="mb-4 p-3 rounded-xl bg-card border border-border">
                  <ProgressBar value={impactProgress} max={impactTotal} />
                </div>
              )}

              {tierEntries.length === 0 && (
                <div className="mb-3 p-3 rounded-xl flex items-center gap-3"
                  style={{ background: "#FFF8E6", border: "1px solid #F0D890" }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#9A6B00" }} />
                  <p className="text-sm" style={{ color: "#9A6B00" }}>
                    Nenhum Tier configurado.{" "}
                    <a href="/tier-config" className="underline font-medium">Configure os tiers</a>{" "}
                    para preenchimento automático por URL.
                  </p>
                </div>
              )}

              <CountryTabs countries={countries} active={activeCountry} onSelect={setActiveCountry} rows={rows} />
              <DataTable rows={displayRows} showProcessedColumns={true}
                onProactiveChange={handleProactiveFiltered}
                onTierChange={handleTierFiltered}
                onImpactChange={handleImpactFiltered}
                onSentimentChange={handleSentimentFiltered} />
            </div>
          )}

          {/* ══ STEP 4 — REVIEW ═══════════════════════ */}
          {mode === "clipping" && step === 4 && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Review — Resumo & Gráficos
                  </h2>
                  <p className="text-text-muted text-xs mt-0.5">
                    Visão consolidada dos dados processados. Filtre por país usando as abas.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep(3)} className={btnSecondary}>
                    <RefreshCw className="w-3.5 h-3.5" /> Voltar
                  </button>
                  <button onClick={() => setStep(5)} className={btnPrimary} style={{ background: "#4A7B1E" }}>
                    Exportar <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <CountryTabs countries={countries} active={activeCountry} onSelect={setActiveCountry} rows={rows} />
              <ReviewSection rows={displayRows} />
            </div>
          )}

          {/* ══ STEP 5 — EXPORT ═══════════════════════ */}
          {mode === "clipping" && step === 5 && (
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "#E3F4D0", border: "1px solid #A8D880" }}>
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-text-base">Pronto para Exportar!</h2>
                <p className="text-text-muted text-sm mt-1">Planilha processada e compatível com Google Drive</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <StatCard icon={FileText} label="Total de Registros" value={rows.length} color="primary"
                  tooltip="Total de notícias processadas na planilha." />
                <StatCard icon={TrendingUp} label="Com Impacto" value={withImpact} color="accent"
                  sub={`${rows.length > 0 ? Math.round((withImpact/rows.length)*100) : 0}% do total`}
                  tooltip="Notícias onde Eurofarma é citada 2+ vezes ou está no título." />
                <StatCard icon={Globe} label="Sem Impacto" value={withoutImpact} color="muted"
                  tooltip="Notícias onde Eurofarma tem menos de 2 menções e não está no título." />
                <StatCard icon={Zap} label="AVE Total" color="accent"
                  value={fmtAVE(rows.reduce((s, r) => s + (parseFloat(String(r.AVE ?? "").replace(/[$,\s]/g, "")) || 0), 0)).display}
                  tooltip="Valor total em dólares do espaço editorial equivalente a publicidade paga." />
              </div>

              <div className="mb-5 p-4 rounded-xl bg-card border border-border">
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Colunas exportadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Date","Headline","URL","Source","Country","Reach","AVE","Sentiment",
                    "Proactive or Spontaneous","With Impact or Without Impact","Tier"].map((col, i) => (
                    <span key={col} className="px-2 py-0.5 rounded-lg text-xs font-medium"
                      style={i >= 8
                        ? { background: "#E3F4D0", color: "#3A7015", border: "1px solid #A8D880" }
                        : { background: "#F0F5EE", color: "#4A7B1E", border: "1px solid #DDE8D8" }}>
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={handleExport}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                  style={{ background: "#4A7B1E" }}>
                  <Download className="w-4 h-4" /> Baixar Planilha (.xlsx)
                </button>
                <button onClick={resetWizard}
                  className="w-full flex items-center justify-center gap-3 px-6 py-2.5 rounded-xl border border-border text-text-muted hover:text-text-base text-sm transition-all bg-card hover:border-primary/50">
                  <RefreshCw className="w-3.5 h-3.5" /> Processar Nova Planilha
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
