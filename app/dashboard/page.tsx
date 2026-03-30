"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, CheckCircle2, Loader2, Download, AlertTriangle, RefreshCw, Zap, TrendingUp, Globe, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import StepIndicator from "@/components/StepIndicator";
import DataTable from "@/components/DataTable";
import type { ProcessedRow, TierEntry, WizardStep } from "@/lib/types";

function StatCard({ icon: Icon, label, value, sub, color = "primary" }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color?: "primary"|"accent"|"muted" }) {
  const colorCls = color==="accent"?"text-accent":color==="muted"?"text-text-muted":"text-primary";
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className={`w-4 h-4 ${colorCls}`} />
      </div>
      <div>
        <p className="text-text-muted text-xs">{label}</p>
        <p className={`text-xl font-bold mt-0.5 ${colorCls}`}>{value}</p>
        {sub && <p className="text-text-muted text-[11px] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-text-muted mb-1">
        <span>Verificando impacto nos links…</span>
        <span>{value}/{max} ({pct}%)</span>
      </div>
      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

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

  useEffect(() => {
    const saved = localStorage.getItem("rpautomation_tiers");
    if (saved) { try { setTierEntries(JSON.parse(saved)); } catch { /* ignore */ } }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploadError(""); setFileName(file.name); setFileSize(file.size); setIsProcessing(true);
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
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"], "text/tab-separated-values": [".tsv"] },
    multiple: false, disabled: isProcessing,
  });

  const checkAllImpact = async () => {
    setIsCheckingImpact(true); setImpactProgress(0); setImpactTotal(rows.length);
    setRows((prev) => prev.map((r) => ({ ...r, "With Impact or Without Impact": "Checking..." })));
    const batchSize = 5;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await Promise.all(batch.map(async (row, bIdx) => {
        const globalIdx = i + bIdx;
        try {
          const res = await fetch("/api/check-impact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: row.URL }) });
          const data = await res.json();
          setRows((prev) => { const updated = [...prev]; updated[globalIdx] = { ...updated[globalIdx], "With Impact or Without Impact": data.impact }; return updated; });
        } catch {
          setRows((prev) => { const updated = [...prev]; updated[globalIdx] = { ...updated[globalIdx], "With Impact or Without Impact": "Error" }; return updated; });
        }
        setImpactProgress((p) => p + 1);
      }));
    }
    setIsCheckingImpact(false);
  };

  const handleProactiveChange = (index: number, value: "Proactive"|"Spontaneous") => {
    setRows((prev) => { const updated = [...prev]; updated[index] = { ...updated[index], "Proactive or Spontaneous": value }; return updated; });
  };

  const handleExport = async () => {
    const res = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `RPAutomation_Export_${new Date().toISOString().split("T")[0]}.xlsx`; a.click();
    window.URL.revokeObjectURL(url);
  };

  const withImpact = rows.filter((r) => r["With Impact or Without Impact"]==="With Impact").length;
  const withoutImpact = rows.filter((r) => r["With Impact or Without Impact"]==="Without Impact").length;
  const totalAVE = rows.reduce((sum, r) => sum + (Number(r.AVE) || 0), 0);
  const totalReach = rows.reduce((sum, r) => sum + (Number(r.Reach) || 0), 0);

  const resetWizard = () => { setStep(1); setRows([]); setFileName(""); setFileSize(0); setUploadError(""); setImpactProgress(0); setImpactTotal(0); setIsCheckingImpact(false); };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-14">
        <div className="border-b border-border bg-card/50">
          <div className="max-w-screen-xl mx-auto px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-text-base">Automação de RP</h1>
                <p className="text-text-muted text-sm mt-0.5">Importe, processe e exporte seus relatórios de clipping</p>
              </div>
              <StepIndicator currentStep={step} onStepClick={(s) => s < step && setStep(s)} />
            </div>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-8">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4"><Upload className="w-6 h-6 text-accent" /></div>
                <h2 className="text-xl font-bold text-text-base">Inserir Planilha</h2>
                <p className="text-text-muted text-sm mt-2">Faça upload do arquivo CSV ou XLSX exportado do seu sistema de monitoramento</p>
              </div>
              <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isDragActive?"border-accent bg-accent/5":isProcessing?"border-border opacity-60 cursor-not-allowed":"border-border hover:border-primary/60 hover:bg-card/50"}`}>
                <input {...getInputProps()} />
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3"><Loader2 className="w-10 h-10 text-primary animate-spin" /><p className="text-text-muted">Processando arquivo…</p></div>
                ) : isDragActive ? (
                  <div className="flex flex-col items-center gap-3"><FileSpreadsheet className="w-10 h-10 text-accent" /><p className="text-accent font-medium">Solte o arquivo aqui</p></div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <FileSpreadsheet className="w-10 h-10 text-text-muted" />
                    <div>
                      <p className="text-text-base font-medium">Arraste o arquivo ou <span className="text-accent underline">clique para selecionar</span></p>
                      <p className="text-text-muted text-sm mt-1">Suporta CSV, XLSX e XLS</p>
                    </div>
                  </div>
                )}
              </div>
              {uploadError && <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"><AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" /><p className="text-red-400 text-sm">{uploadError}</p></div>}
              <div className="mt-6 p-4 rounded-xl bg-card border border-border">
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3">Campos que serão mantidos</p>
                <div className="grid grid-cols-4 gap-2">
                  {["Date","Headline","URL","Source","Country","Reach","AVE","Sentiment"].map((col) => <div key={col} className="bg-bg rounded-lg px-2 py-1.5 text-center"><span className="text-primary text-xs font-medium">{col}</span></div>)}
                </div>
                <div className="border-t border-border mt-3 pt-3">
                  <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Campos adicionados automaticamente</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["Proactive or Spontaneous","With Impact or Without Impact","Tier"].map((col) => <div key={col} className="bg-accent/5 border border-accent/20 rounded-lg px-2 py-1.5 text-center"><span className="text-accent text-xs font-medium">{col}</span></div>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-text-base flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Pré-visualização — Dados Limpos</h2>
                  <p className="text-text-muted text-sm mt-1">Arquivo: <span className="text-primary">{fileName}</span> • {rows.length} registros • {(fileSize/1024).toFixed(1)} KB</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={resetWizard} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-text-muted hover:text-text-base hover:border-primary/50 text-sm transition-all"><RefreshCw className="w-3.5 h-3.5" />Novo arquivo</button>
                  <button onClick={() => setStep(3)} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-bg font-semibold text-sm hover:bg-primary-dark transition-all">Avançar para Processamento<Zap className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard icon={FileText} label="Total de Notícias" value={rows.length} color="accent" />
                <StatCard icon={Globe} label="Fontes Únicas" value={new Set(rows.map((r)=>r.Source)).size} />
                <StatCard icon={TrendingUp} label="Alcance Total" value={totalReach.toLocaleString("pt-BR")} />
                <StatCard icon={Zap} label="AVE Total" value={`R$ ${totalAVE.toLocaleString("pt-BR",{minimumFractionDigits:2})}`} color="accent" />
              </div>
              <DataTable rows={rows} showProcessedColumns={false} />
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-text-base">Processamento Inteligente</h2>
                  <p className="text-text-muted text-sm mt-1">Defina Proativo/Espontâneo e verifique o impacto automaticamente</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isCheckingImpact && <button onClick={checkAllImpact} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-text-base hover:border-primary/60 text-sm transition-all"><RefreshCw className="w-3.5 h-3.5" />Verificar Impacto</button>}
                  <button onClick={() => setStep(4)} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-bg font-semibold text-sm hover:bg-primary-dark transition-all">Finalizar e Exportar<Download className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {isCheckingImpact && <div className="mb-6 p-4 rounded-xl bg-card border border-border"><ProgressBar value={impactProgress} max={impactTotal} /></div>}
              {tierEntries.length === 0 && <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3"><AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" /><p className="text-yellow-400 text-sm">Nenhuma configuração de Tier encontrada. <a href="/tier-config" className="underline hover:text-yellow-300">Configure os tiers</a> para preenchimento automático.</p></div>}
              <DataTable rows={rows} showProcessedColumns={true} onProactiveChange={handleProactiveChange} />
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-6 h-6 text-accent" /></div>
                <h2 className="text-xl font-bold text-text-base">Pronto para Exportar!</h2>
                <p className="text-text-muted text-sm mt-2">Sua planilha foi processada e está pronta para o Google Drive</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <StatCard icon={FileText} label="Total de Registros" value={rows.length} color="accent" />
                <StatCard icon={TrendingUp} label="Com Impacto" value={withImpact} sub={`${rows.length>0?Math.round((withImpact/rows.length)*100):0}% do total`} />
                <StatCard icon={Globe} label="Sem Impacto" value={withoutImpact} color="muted" />
                <StatCard icon={Zap} label="AVE Total" value={`R$ ${totalAVE.toLocaleString("pt-BR",{minimumFractionDigits:2})}`} color="accent" />
              </div>
              <div className="mb-8 p-4 rounded-xl bg-card border border-border">
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3">Colunas na planilha exportada</p>
                <div className="flex flex-wrap gap-2">
                  {["Date","Headline","URL","Source","Country","Reach","AVE","Sentiment","Proactive or Spontaneous","With Impact or Without Impact","Tier"].map((col,i) => <span key={col} className={`px-2 py-1 rounded-lg text-xs font-medium ${i>=8?"bg-accent/10 text-accent border border-accent/20":"bg-bg text-primary border border-border"}`}>{col}</span>)}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={handleExport} className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-accent text-bg font-bold text-base hover:bg-primary transition-all"><Download className="w-5 h-5" />Baixar Planilha (.xlsx)</button>
                <button onClick={resetWizard} className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-border text-text-muted hover:text-text-base hover:border-primary/50 text-sm transition-all"><RefreshCw className="w-4 h-4" />Processar Nova Planilha</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
