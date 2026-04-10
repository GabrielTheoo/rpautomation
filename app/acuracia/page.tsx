"use client";

import { useState, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileSpreadsheet, Loader2, AlertTriangle,
  CheckCircle2, ArrowLeft, Download, Save, BarChart3,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import type { ProcessedRow } from "@/lib/types";

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

// ─── Sub-components ───────────────────────────────────

function KpiCard({ label, value, sub, footer, color = "primary", bar }: {
  label: string; value: string | number; sub?: string;
  footer?: string; color?: "primary" | "accent" | "muted"; bar?: number;
}) {
  const valueCls = color === "accent" ? "text-accent" : color === "muted" ? "text-text-muted" : "text-primary";
  return (
    <div className="flex-1 bg-card border border-border rounded-xl p-4 flex flex-col gap-3 min-w-0">
      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider leading-tight">{label}</span>
      <div className="flex flex-col gap-0.5">
        <span className={`text-2xl sm:text-3xl font-bold ${valueCls} truncate`}>{value}</span>
        {sub && <span className="text-xs text-text-muted">{sub}</span>}
      </div>
      {bar !== undefined && (
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${bar}%`, background: color === "accent" ? "#5EA818" : "#4A7B1E" }} />
        </div>
      )}
      {footer && bar === undefined && (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "#5EA818" }}></div>
          <span className="text-xs text-text-muted">{footer}</span>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, barPct, color = "primary", badge }: {
  label: string; value: string | number; sub?: string;
  barPct?: number; color?: "primary" | "accent"; badge?: string;
}) {
  const valueCls = color === "accent" ? "text-accent" : "text-primary";
  return (
    <div className="flex-1 bg-card border border-border rounded-xl p-4 flex flex-col gap-2 min-w-0">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-xs text-text-muted leading-tight">{label}</span>
        <span className={`text-xl font-bold ${valueCls} truncate`}>{value}</span>
        {sub && <span className="text-[11px] text-text-muted">{sub}</span>}
      </div>
      {badge && (
        <div className="pt-1 border-t border-border">
          <span className="inline-flex px-2 py-0.5 rounded-full bg-bg border border-border text-[10px] font-medium text-text-muted">
            {badge}
          </span>
        </div>
      )}
      {barPct !== undefined && (
        <div className="pt-1 border-t border-border">
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full rounded-full"
              style={{ width: `${barPct}%`, background: color === "accent" ? "#5EA818" : "#4A7B1E" }} />
          </div>
        </div>
      )}
    </div>
  );
}

function HBar({ label, value, max, color, dot }: {
  label: string; value: number; max: number; color: string; dot: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }}></div>
          <span className="text-xs text-text-muted">{label}</span>
        </div>
        <span className="text-xs font-semibold text-text-base">
          {value}{" "}
          <span className="text-text-muted font-normal">({max > 0 ? Math.round(pct) : 0}%)</span>
        </span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, minWidth: value > 0 ? "6px" : "0" }} />
      </div>
    </div>
  );
}

function ChartCard({ title, children, footer }: {
  title: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="flex-1 bg-card border border-border rounded-xl p-4 flex flex-col gap-3 min-w-0">
      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</span>
      <div className="flex flex-col gap-2.5 flex-1">{children}</div>
      {footer && <div className="pt-3 border-t border-border">{footer}</div>}
    </div>
  );
}

function CountryTabs({ countries, active, onSelect, rows }: {
  countries: string[]; active: string;
  onSelect: (c: string) => void; rows: ProcessedRow[];
}) {
  if (countries.length <= 1) return null;
  const intlCount = rows.filter(r => !isBrazilStr(r.Country)).length;
  return (
    <div className="flex gap-1.5 flex-wrap mb-4">
      <button onClick={() => onSelect("all")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          active === "all"
            ? "bg-primary text-white shadow-sm"
            : "bg-card border border-border text-text-muted hover:border-primary/50 hover:text-text-base"
        }`}>
        Todos <span className="opacity-60">{rows.length}</span>
      </button>
      {intlCount > 0 && (
        <button onClick={() => onSelect("internacional")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            active === "internacional"
              ? "bg-primary text-white shadow-sm"
              : "bg-card border border-border text-text-muted hover:border-primary/50 hover:text-text-base"
          }`}>
          Internacional <span className="opacity-60">{intlCount}</span>
        </button>
      )}
      {countries.map(c => {
        const count = rows.filter(r => String(r.Country || "") === c).length;
        return (
          <button key={c} onClick={() => onSelect(c)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              active === c
                ? "bg-primary text-white shadow-sm"
                : isBrazilStr(c)
                  ? "bg-card border-2 border-primary/40 text-primary hover:border-primary"
                  : "bg-card border border-border text-text-muted hover:border-primary/50 hover:text-text-base"
            }`}>
            {c || "—"} <span className="opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReviewDashboard({ rows, allRows }: { rows: ProcessedRow[]; allRows: ProcessedRow[] }) {
  const n = rows.length;
  const totalAVE   = rows.reduce((s, r) => s + (parseFloat(String(r.AVE ?? "").replace(/[$,\s]/g, "")) || 0), 0);
  const totalReach = rows.reduce((s, r) => s + (Number(r.Reach) || 0), 0);
  const uniqSrc    = new Set(rows.map(r => r.Source)).size;

  const tier1    = rows.filter(r => r.Tier === "1");
  const tier2    = rows.filter(r => r.Tier === "2");
  const tier3    = rows.filter(r => r.Tier === "3");
  const tierNone = rows.filter(r => !r.Tier || r.Tier === "N/A");

  const aveTier1   = tier1.reduce((s, r) => s + (parseFloat(String(r.AVE ?? "").replace(/[$,\s]/g, "")) || 0), 0);
  const reachTier1 = tier1.reduce((s, r) => s + (Number(r.Reach) || 0), 0);
  const tier1Pos   = tier1.filter(r => String(r.Sentiment || "").toLowerCase() === "positive").length;

  const positive  = rows.filter(r => String(r.Sentiment || "").toLowerCase() === "positive").length;
  const neutral   = rows.filter(r => String(r.Sentiment || "").toLowerCase() === "neutral").length;
  const negative  = rows.filter(r => String(r.Sentiment || "").toLowerCase() === "negative").length;

  const withImpactRows = rows.filter(r => r["With Impact or Without Impact"] === "With Impact");
  const withImpact    = withImpactRows.length;
  const withoutImpact = rows.filter(r => r["With Impact or Without Impact"] === "Without Impact").length;
  const impactTier1   = tier1.filter(r => r["With Impact or Without Impact"] === "With Impact").length;

  const impactPositive = withImpactRows.filter(r => String(r.Sentiment || "").toLowerCase() === "positive").length;
  const impactNeutral  = withImpactRows.filter(r => String(r.Sentiment || "").toLowerCase() === "neutral").length;
  const impactNegative = withImpactRows.filter(r => String(r.Sentiment || "").toLowerCase() === "negative").length;

  const positividade = n > 0 ? Math.round(((positive + neutral - negative) / n) * 100) : 0;
  const aveWithImpact = rows
    .filter(r => r["With Impact or Without Impact"] === "With Impact")
    .reduce((s, r) => s + (parseFloat(String(r.AVE ?? "").replace(/[$,\s]/g, "")) || 0), 0);
  const proativeWithImpact = rows.filter(
    r => r["With Impact or Without Impact"] === "With Impact" &&
         String(r["Proactive or Spontaneous"] || "").toLowerCase() === "proactive"
  ).length;
  const aveProativeWithImpact = rows
    .filter(r => r["With Impact or Without Impact"] === "With Impact" &&
                 String(r["Proactive or Spontaneous"] || "").toLowerCase() === "proactive")
    .reduce((s, r) => s + (parseFloat(String(r.AVE ?? "").replace(/[$,\s]/g, "")) || 0), 0);
  const tier1AllCountries = allRows.filter(r => r.Tier === "1").length;

  const aveFmt           = fmtAVE(totalAVE);
  const aveTier1Fmt      = fmtAVE(aveTier1);
  const aveWithImpactFmt = fmtAVE(aveWithImpact);
  const aveProativeFmt   = fmtAVE(aveProativeWithImpact);

  const reachDisplay = totalReach >= 1_000_000
    ? `${(totalReach / 1_000_000).toFixed(1)}M`
    : totalReach.toLocaleString("pt-BR");
  const reachT1Display = reachTier1 >= 1_000_000
    ? `${(reachTier1 / 1_000_000).toFixed(1)}M`
    : reachTier1.toLocaleString("pt-BR");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 flex-wrap sm:flex-nowrap">
        <KpiCard label="Total de Notícias" value={n} sub="matérias no período"
          footer={`${uniqSrc} veículos únicos`} color="primary" />
        <KpiCard label="AVE Total" value={aveFmt.display} sub="valor equivalente em mídia"
          footer={`Tier 1: ${aveTier1Fmt.display}`} color="accent" />
        <KpiCard label="Alcance Total" value={reachDisplay} sub="leitores potenciais"
          footer={`Tier 1: ${reachT1Display}`} color="accent" />
        <KpiCard label="% Positividade" value={`${positividade}%`} sub="saldo positivo geral"
          bar={Math.max(0, Math.min(100, positividade))} color="primary" />
      </div>

      <div className="flex gap-4 flex-wrap sm:flex-nowrap">
        <ChartCard title="Distribuição de Sentimento">
          <HBar label="Positivo" value={positive} max={n} color="#4A7B1E" dot="#4A7B1E" />
          <HBar label="Neutro"   value={neutral}  max={n} color="#9CA3AF" dot="#9CA3AF" />
          <HBar label="Negativo" value={negative} max={n} color="#EF4444" dot="#EF4444" />
          {n - positive - neutral - negative > 0 && (
            <HBar label="Não definido" value={n - positive - neutral - negative} max={n} color="#E5E7EB" dot="#E5E7EB" />
          )}
        </ChartCard>

        <ChartCard
          title="Distribuição de Impacto"
          footer={
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">AVE com Impacto</span>
              <span className="text-sm font-bold text-accent">{aveWithImpactFmt.display}</span>
            </div>
          }
        >
          <HBar label="Com Impacto"    value={withImpact}    max={n} color="#5EA818" dot="#5EA818" />
          <HBar label="Sem Impacto"    value={withoutImpact} max={n} color="#D1D5DB" dot="#D1D5DB" />
          {n - withImpact - withoutImpact > 0 && (
            <HBar label="Não verificado" value={n - withImpact - withoutImpact} max={n} color="#F3F4F6" dot="#E5E7EB" />
          )}
        </ChartCard>

        <ChartCard
          title="Distribuição de Tier"
          footer={
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Sem Tier</span>
              <span className="text-xs font-medium text-text-muted">{tierNone.length} matérias</span>
            </div>
          }
        >
          <HBar label="Tier 1" value={tier1.length} max={n} color="#3A7015" dot="#3A7015" />
          <HBar label="Tier 2" value={tier2.length} max={n} color="#5EA818" dot="#5EA818" />
          <HBar label="Tier 3" value={tier3.length} max={n} color="#A8D880" dot="#A8D880" />
        </ChartCard>

        <ChartCard
          title="Sentimento c/ Impacto"
          footer={
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Total c/ impacto</span>
              <span className="text-xs font-medium text-text-muted">{withImpact} matérias</span>
            </div>
          }
        >
          <HBar label="Positivo" value={impactPositive} max={withImpact} color="#4A7B1E" dot="#4A7B1E" />
          <HBar label="Neutro"   value={impactNeutral}  max={withImpact} color="#9CA3AF" dot="#9CA3AF" />
          <HBar label="Negativo" value={impactNegative} max={withImpact} color="#EF4444" dot="#EF4444" />
          {withImpact - impactPositive - impactNeutral - impactNegative > 0 && (
            <HBar label="Não definido" value={withImpact - impactPositive - impactNeutral - impactNegative} max={withImpact} color="#E5E7EB" dot="#E5E7EB" />
          )}
        </ChartCard>
      </div>

      <div className="flex gap-4 flex-wrap sm:flex-nowrap">
        <MetricCard label="AVE Tier 1" value={aveTier1Fmt.display}
          sub={`Reach T1: ${reachT1Display}`} badge={`${tier1Pos} T1 positivas`} color="accent" />
        <MetricCard label="Com Impacto (T1)" value={impactTier1}
          sub={`de ${tier1.length} matérias Tier 1`}
          barPct={tier1.length > 0 ? Math.round((impactTier1 / tier1.length) * 100) : 0} color="primary" />
        <MetricCard label="Proativas c/ Impacto" value={proativeWithImpact}
          sub={`AVE: ${aveProativeFmt.display}`}
          barPct={n > 0 ? Math.round((proativeWithImpact / n) * 100) : 0} color="accent" />
        <MetricCard label="Tier 1 (todos países)" value={tier1AllCountries}
          sub="inclui internacionais"
          badge={tier1AllCountries > tier1.length ? `+${tier1AllCountries - tier1.length} internacionais` : undefined}
          color="primary" />
        <MetricCard label="AVE c/ Impacto (geral)" value={aveWithImpactFmt.display}
          sub="todos os tiers"
          barPct={n > 0 ? Math.round((withImpact / n) * 100) : 0} color="accent" />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────
type Step = 1 | 2;

export default function AcuraciaPage() {
  const router = useRouter();
  const [step, setStep]             = useState<Step>(1);
  const [rows, setRows]             = useState<ProcessedRow[]>([]);
  const [fileName, setFileName]     = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeCountry, setActive]  = useState("all");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  // Unique countries from rows
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

  const displayRows = useMemo(() => rows.filter(row => {
    if (activeCountry === "all") return true;
    if (activeCountry === "internacional") return !isBrazilStr(row.Country);
    return String(row.Country || "") === activeCountry;
  }), [rows, activeCountry]);

  // Computed summary stats
  const withImpactCount    = rows.filter(r => r["With Impact or Without Impact"] === "With Impact").length;
  const withoutImpactCount = rows.filter(r => r["With Impact or Without Impact"] === "Without Impact").length;
  const totalAVE = rows.reduce((s, r) => s + (parseFloat(String(r.AVE ?? "").replace(/[$,\s]/g, "")) || 0), 0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploadError("");
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/acuracia", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Erro ao processar planilha.");
        return;
      }
      setRows(data.rows);
      setFileName(data.fileName);
      setActive("all");
      setSaved(false);
      setStep(2);
    } catch {
      setUploadError("Erro inesperado ao processar o arquivo.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    disabled: isUploading,
  });

  const handleSave = async () => {
    if (saved) { router.push("/historico"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/acuracia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          exportedAt: new Date().toISOString(),
          rowCount: rows.length,
          withImpactCount,
          withoutImpactCount,
          totalAVE,
          countries,
          rows,
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.push("/historico");
      }
    } finally {
      setSaving(false);
    }
  };

  const btnSecondary = "flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-text-muted hover:text-text-base hover:border-primary/50 text-sm transition-all bg-card";
  const btnPrimary   = "flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90";

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-[52px]">

        {/* Sub-header */}
        <div className="border-b border-border bg-card shadow-sm">
          <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-base font-bold text-text-base">Automação de RP</span>
              <p className="text-text-muted text-xs mt-0.5 hidden sm:block">
                {step === 1 ? "Acurácia → Upload" : `Acurácia → ${fileName} → Dashboard`}
              </p>
            </div>
            {step === 2 && (
              <div className="flex items-center gap-2">
                <button onClick={() => setStep(1)} className={btnSecondary}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`${btnPrimary} ${saved ? "opacity-70 cursor-default" : ""}`}
                  style={{ background: "#4A7B1E" }}
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : saved ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar no Histórico"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-full px-4 sm:px-6 py-6">

          {/* ── STEP 1: Upload ── */}
          {step === 1 && (
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(74,123,30,0.1)", border: "1px solid rgba(74,123,30,0.25)" }}>
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-text-base">Acurácia — Upload</h2>
                <p className="text-text-muted text-sm mt-1">
                  Envie uma planilha XLSX com múltiplas abas (uma por país). Cada aba deve ter as colunas: Date, Headline, URL, Source, Country, Reach, AVE, Sentiment, Proactive or Spontaneous, With Impact or Without Impact, Tier.
                </p>
              </div>

              <div {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragActive ? "border-accent bg-green-50" :
                  isUploading  ? "border-border opacity-60 cursor-not-allowed" :
                  "border-border hover:border-primary/60 hover:bg-card"
                }`}>
                <input {...getInputProps()} />
                {isUploading ? (
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
                    <Upload className="w-9 h-9 text-text-muted" />
                    <div>
                      <p className="text-text-base font-medium text-sm">
                        Arraste ou <span className="text-primary underline cursor-pointer">clique para selecionar</span>
                      </p>
                      <p className="text-text-muted text-xs mt-1">XLSX ou XLS com múltiplas abas</p>
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

              <button onClick={() => router.push("/dashboard")}
                className="mt-4 w-full text-xs text-text-muted hover:text-primary text-center transition-colors">
                ← Voltar ao início
              </button>
            </div>
          )}

          {/* ── STEP 2: Review Dashboard ── */}
          {step === 2 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Dashboard de Acurácia
                  </h2>
                  <p className="text-text-muted text-sm mt-0.5">
                    <span className="font-medium text-text-base">{fileName}</span>
                    {" · "}{rows.length} matérias · {countries.length} países
                  </p>
                </div>
              </div>

              <CountryTabs
                countries={countries}
                active={activeCountry}
                onSelect={setActive}
                rows={rows}
              />

              <ReviewDashboard rows={displayRows} allRows={rows} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
