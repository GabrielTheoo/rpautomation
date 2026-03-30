"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileSpreadsheet, CheckCircle2, Loader2,
  Download, AlertTriangle, RefreshCw, Zap, TrendingUp, Globe, FileText,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import StepIndicator from "@/components/StepIndicator";
import DataTable from "@/components/DataTable";
import type { ProcessedRow, TierEntry, WizardStep } from "@/lib/types";

function isBrazilStr(country: string | number | undefined): boolean {
  const c = String(country || "").toLowerCase().trim();
  return c.includes("brazil") || c.includes("brasil");
}

function CountryTabs({
  countries, active, onSelect, rows,
}: {
  countries: string[];
  active: string;
  onSelect: (c: string) => void;
  rows: ProcessedRow[];
}) {
  if (countries.length <= 1) return null;
  return (
    <div className="flex gap-1.5 flex-wrap mb-3">
      <button
        onClick={() => onSelect("all")}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          active === "all"
            ? "bg-primary text-white shadow-sm"
            : "bg-card border border-border text-text-muted hover:border-primary/50 hover:text-text-base"
        }`}
      >
        Todos <span className="ml-1 opacity-60">{rows.length}</span>
      </button>
      {countries.map((c) => {
        const count = rows.filter((r) => String(r.Country || "") === c).length;
        const isBr = isBrazilStr(c);
        return (
          <button
            key={c}
            onClick={() => onSelect(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              active === c
                ? "bg-primary text-white shadow-sm"
                : isBr
                ? "bg-card border-2 border-primary/40 text-primary hover:border-primary"
                : "bg-card border border-border text-text-muted hover:border-primary/50 hover:text-text-base"
            }`}
          >
            {c || "—"} <span className="ml-1 opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: "primary" | "accent" | "muted";
  tooltip: string;
}

function StatCard({ icon: Icon, label, value, sub, color = "primary", tooltip }: StatCardProps) {
  const colorCls =
    color === "accent" ? "text-accent" : color === "muted" ? "text-text-muted" : "text-primary";
  return (
    <div className="tooltip-wrapper">
      <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 cursor-default hover:border-primary/50 transition-colors">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(74,123,30,0.08)" }}>
          <Icon className={`w-4 h-4 ${colorCls}`} />
        </div>
        <div>
          <p className="text-text-muted text-xs">{label}</p>
          <p className={`text-xl font-bold mt-0.5 ${colorCls}`}>{value}</p>
          {sub && <p className="text-text-muted text-[11px] mt-0.5">{sub}</p>}
        </div>
      </div>
      <div className="tooltip-box">{tooltip}</div>
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-text-muted mb-1">
        <span>Verificando impacto nos links… acessa cada URL e conta menções à Eurofarma</span>
        <span className="font-medium">{value}/{max} ({pct}%)</span>
      </div>
      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #4A7B1E, #5EA818)" }}
        />
      </div>
    </div>
  );
}

const btnPrimary = "flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90";
const btnSecondary = "flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-text-muted hover:text-text-base hover:border-primary/50 text-sm transition-all bg-card";

export default function Dashboard() {
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

  const countries = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
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
    rows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => activeCountry === "all" || String(row.Country || "") === activeCountry),
    [rows, activeCountry]
  );

  const displayRows = useMemo(() => filteredWithIdx.map((x) => x.row), [filteredWithIdx]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploadError(""); setFileName(file.name); setFileSize(file.size); setIsProcessing(true);
    setActiveCountry("all");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tierEntries", JSON.stringify(tierEntries));
      const res = await fetch("/api/process", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Erro ao processar arquivo");
      const data = await res.json();
      setRows(data.rows);
      setStep(2);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsProcessing(false);
    }
  }, [tierEntries]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/tab-separated-values": [".tsv"],
    },
    multiple: false,
    disabled: isProcessing,
  });

  const checkAllImpact = async () => {
    const brazilCount = rows.filter((r) => isBrazilStr(r.Country)).length;
    setIsCheckingImpact(true);
    setImpactProgress(0);
    setImpactTotal(brazilCount);
    setRows((prev) =>
      prev.map((r) =>
        isBrazilStr(r.Country) ? { ...r, "With Impact or Without Impact": "Checking..." } : r
      )
    );
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
          setRows((prev) => {
            const updated = [...prev];
            updated[globalIdx] = { ...updated[globalIdx], "With Impact or Without Impact": data.impact };
            return updated;
          });
        } catch {
          setRows((prev) => {
            const updated = [...prev];
            updated[globalIdx] = { ...updated[globalIdx], "With Impact or Without Impact": "Error" };
            return updated;
          });
        }
        setImpactProgress((p) => p + 1);
      }));
    }
    setIsCheckingImpact(false);
  };

  const handleProactiveChange = (index: number, value: "Proactive" | "Spontaneous") => {
    setRows((prev) => { const u = [...prev]; u[index] = { ...u[index], "Proactive or Spontaneous": value }; return u; });
  };
  const handleTierChange = (index: number, value: "1" | "2" | "3" | "") => {
    setRows((prev) => { const u = [...prev]; u[index] = { ...u[index], Tier: value }; return u; });
  };
  const handleImpactChange = (index: number, value: "With Impact" | "Without Impact" | "") => {
    setRows((prev) => { const u = [...prev]; u[index] = { ...u[index], "With Impact or Without Impact": value }; return u; });
  };
  const handleSentimentChange = (index: number, value: string) => {
    setRows((prev) => { const u = [...prev]; u[index] = { ...u[index], Sentiment: value }; return u; });
  };

  const handleProactiveFiltered = (filteredIdx: number, value: "Proactive" | "Spontaneous") =>
    handleProactiveChange(filteredWithIdx[filteredIdx].idx, value);
  const handleTierFiltered = (filteredIdx: number, value: "1" | "2" | "3" | "") =>
    handleTierChange(filteredWithIdx[filteredIdx].idx, value);
  const handleImpactFiltered = (filteredIdx: number, value: "With Impact" | "Without Impact" | "") =>
    handleImpactChange(filteredWithIdx[filteredIdx].idx, value);
  const handleSentimentFiltered = (filteredIdx: number, value: string) =>
    handleSentimentChange(filteredWithIdx[filteredIdx].idx, value);

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

  const withImpact = rows.filter((r) => r["With Impact or Without Impact"] === "With Impact").length;
  const withoutImpact = rows.filter((r) => r["With Impact or Without Impact"] === "Without Impact").length;
  const totalAVE = rows.reduce((sum, r) => sum + (Number(r.AVE) || 0), 0);
  const totalReach = rows.reduce((sum, r) => sum + (Number(r.Reach) || 0), 0);
  const uniqueSources = new Set(rows.map((r) => r.Source)).size;

  const resetWizard = () => {
    setStep(1); setRows([]); setFileName(""); setFileSize(0);
    setUploadError(""); setImpactProgress(0); setImpactTotal(0);
    setIsCheckingImpact(false); setActiveCountry("all");
  };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-[52px]">
        <div className="border-b border-border bg-card shadow-sm">
          <div className="w-full px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-base font-bold text-text-base">Automação de RP</h1>
              <p className="text-text-muted text-xs mt-0.5">Importe, processe e exporte seus relatórios de clipping</p>
            </div>
            <StepIndicator currentStep={step} onStepClick={(s) => s < step && setStep(s)} />
          </div>
        </div>
        <div className="w-full px-4 py-6">
          {step === 1 && (
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(74,123,30,0.1)", border: "1px solid rgba(74,123,30,0.25)" }}>
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-text-base">Inserir Planilha</h2>
                <p className="text-text-muted text-sm mt-1">Upload do CSV ou XLSX exportado do seu sistema de monitoramento</p>
              </div>
              <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
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
                      <p className="text-text-base font-medium text-sm">Arraste ou <span className="text-primary underline cursor-pointer">clique para selecionar</span></p>
                      <p className="text-text-muted text-xs mt-1">CSV, XLSX ou XLS</p>
                    </div>
                  </div>
                )}
              </div>
              {uploadError && (
                <div className="mt-4 p-3 rounded-xl flex items-center gap-3" style={{ background: "#FDECEC", border: "1px solid #F5B8B8" }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#C0392B" }} />
                  <p className="text-sm" style={{ color: "#C0392B" }}>{uploadError}</p>
                </div>
              )}
              <div className="mt-5 p-4 rounded-xl bg-card border border-border">
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Campos mantidos</p>
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {["Date","Headline","URL","Source","Country","Reach","AVE","Sentiment"].map((col) => (
                    <div key={col} className="rounded-lg px-2 py-1.5 text-center" style={{ background: "#F0F5EE", border: "1px solid #DDE8D8" }}>
                      <span className="text-primary text-xs font-medium">{col}</span>
                    </div>
                  ))}
                </div>
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Campos adicionados</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {["Proactive or Spontaneous","With Impact or Without Impact","Tier"].map((col) => (
                    <div key={col} className="rounded-lg px-2 py-1.5 text-center" style={{ background: "#F0F8E8", border: "1px solid #B8D890" }}>
                      <span className="text-xs font-medium" style={{ color: "#4A7B1E" }}>{col}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-text-base flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" />Pré-visualização — Dados Limpos</h2>
                  <p className="text-text-muted text-xs mt-0.5"><span className="font-medium text-primary">{fileName}</span> • {rows.length} registros • {(fileSize / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={resetWizard} className={btnSecondary}><RefreshCw className="w-3.5 h-3.5" /> Novo arquivo</button>
                  <button onClick={() => setStep(3)} className={btnPrimary} style={{ background: "#4A7B1E" }}>Avançar <Zap className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatCard icon={FileText} label="Total de Notícias" value={rows.length} color="primary" tooltip="Número total de notícias importadas da planilha após limpeza dos campos." />
                <StatCard icon={Globe} label="Fontes Únicas" value={uniqueSources} tooltip="Quantidade de veículos/fontes distintos presentes na planilha." />
                <StatCard icon={TrendingUp} label="Alcance Total" value={totalReach.toLocaleString("pt-BR")} tooltip="Soma do Reach (alcance estimado de leitores) de todas as notícias." />
                <StatCard icon={Zap} label="AVE Total" color="accent" value={`$ ${totalAVE.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} tooltip="Advertising Value Equivalency — valor estimado em dólares do espaço editorial como se fosse publicidade paga." />
              </div>
              <CountryTabs countries={countries} active={activeCountry} onSelect={setActiveCountry} rows={rows} />
              <DataTable rows={displayRows} showProcessedColumns={false} onSentimentChange={handleSentimentFiltered} />
            </div>
          )}
          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-text-base">Processamento Inteligente</h2>
                  <p className="text-text-muted text-xs mt-0.5">Tier auto-preenchido por URL • Impacto verificado via leitura da notícia • Proativo/Espontâneo manual</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isCheckingImpact && (<button onClick={checkAllImpact} className={btnSecondary}><RefreshCw className="w-3.5 h-3.5" /> Verificar Impacto</button>)}
                  <button onClick={() => setStep(4)} className={btnPrimary} style={{ background: "#4A7B1E" }}>Exportar <Download className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {isCheckingImpact && (<div className="mb-4 p-3 rounded-xl bg-card border border-border"><ProgressBar value={impactProgress} max={impactTotal} /></div>)}
              {tierEntries.length === 0 && (
                <div className="mb-3 p-3 rounded-xl flex items-center gap-3" style={{ background: "#FFF8E6", border: "1px solid #F0D890" }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#9A6B00" }} />
                  <p className="text-sm" style={{ color: "#9A6B00" }}>Nenhum Tier configurado. <a href="/tier-config" className="underline font-medium">Configure os tiers</a> para preenchimento automático por URL.</p>
                </div>
              )}
              <CountryTabs countries={countries} active={activeCountry} onSelect={setActiveCountry} rows={rows} />
              <DataTable rows={displayRows} showProcessedColumns={true} onProactiveChange={handleProactiveFiltered} onTierChange={handleTierFiltered} onImpactChange={handleImpactFiltered} onSentimentChange={handleSentimentFiltered} />
            </div>
          )}
          {step === 4 && (
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "#E3F4D0", border: "1px solid #A8D880" }}>
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-text-base">Pronto para Exportar!</h2>
                <p className="text-text-muted text-sm mt-1">Planilha processada e compatível com Google Drive</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <StatCard icon={FileText} label="Total de Registros" value={rows.length} color="primary" tooltip="Total de notícias processadas na planilha." />
                <StatCard icon={TrendingUp} label="Com Impacto" value={withImpact} color="accent" sub={`${rows.length > 0 ? Math.round((withImpact/rows.length)*100) : 0}% do total`} tooltip="Notícias onde Eurofarma é citada 2+ vezes ou está no título da matéria." />
                <StatCard icon={Globe} label="Sem Impacto" value={withoutImpact} color="muted" tooltip="Notícias onde Eurofarma é citada menos de 2 vezes e não está no título." />
                <StatCard icon={Zap} label="AVE Total" color="accent" value={`$ ${totalAVE.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} tooltip="Valor total em dólares do espaço editorial equivalente a publicidade paga." />
              </div>
              <div className="mb-5 p-4 rounded-xl bg-card border border-border">
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Colunas exportadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Date","Headline","URL","Source","Country","Reach","AVE","Sentiment","Proactive or Spontaneous","With Impact or Without Impact","Tier"].map((col, i) => (
                    <span key={col} className="px-2 py-0.5 rounded-lg text-xs font-medium"
                      style={i >= 8 ? { background: "#E3F4D0", color: "#3A7015", border: "1px solid #A8D880" } : { background: "#F0F5EE", color: "#4A7B1E", border: "1px solid #DDE8D8" }}>
                      {col}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={handleExport} className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90" style={{ background: "#4A7B1E" }}>
                  <Download className="w-4 h-4" /> Baixar Planilha (.xlsx)
                </button>
                <button onClick={resetWizard} className="w-full flex items-center justify-center gap-3 px-6 py-2.5 rounded-xl border border-border text-text-muted hover:text-text-base text-sm transition-all bg-card hover:border-primary/50">
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