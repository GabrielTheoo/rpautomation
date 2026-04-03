"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Search, FileSpreadsheet, Upload, Loader2, AlertTriangle,
  RefreshCw, ArrowLeft, CheckCircle2, XCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import type { ProcessedRow } from "@/lib/types";

// ─── AVE formatter ────────────────────────────────────
function fmtAVE(val: string | number | undefined | null) {
  const n = parseFloat(String(val ?? "").replace(/[$,\s]/g, "")) || 0;
  if (!val || n === 0) return { display: "—", full: "—", short: false };
  const full = `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 1_000_000_000) return { display: `$ ${(n / 1_000_000_000).toFixed(2)}B`, full, short: true };
  if (n >= 1_000_000)     return { display: `$ ${(n / 1_000_000).toFixed(2)}M`, full, short: true };
  return { display: full, full, short: false };
}

type RowWithStatus = ProcessedRow & {
  _checked: boolean;
  _found: boolean;
  _count: number;
  _source: "content" | "headline" | "none";
};

export default function Pesquisa() {
  const [rows, setRows]             = useState<RowWithStatus[]>([]);
  const [fileName, setFileName]     = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [searchTerm, setSearchTerm]   = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress]       = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Upload ────────────────────────────────────────────
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadError(""); setFileName(file.name); setIsUploading(true);
    setRows([]); setHasSearched(false); setSearchTerm("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tierEntries", "[]");
      const res = await fetch("/api/process", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Erro ao processar arquivo");
      const data = await res.json();
      const parsed: RowWithStatus[] = (data.rows || []).map((r: ProcessedRow) => ({
        ...r, _checked: false, _found: false, _count: 0, _source: "none",
      }));
      setRows(parsed);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    disabled: isUploading || isSearching,
  });

  // ── Search ────────────────────────────────────────────
  const runSearch = async () => {
    if (!searchTerm.trim() || rows.length === 0) return;
    setIsSearching(true);
    setProgress(0);
    setHasSearched(false);

    // Reset statuses
    setRows((prev) => prev.map((r) => ({ ...r, _checked: false, _found: false, _count: 0, _source: "none" as const })));

    const term = searchTerm.trim();
    const termLower = term.toLowerCase();
    const batchSize = 5;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (row, bIdx) => {
          const globalIdx = i + bIdx;

          // Quick headline check (instant, no fetch)
          const headlineMatch = (row.Headline || "").toLowerCase().includes(termLower);

          let found = headlineMatch;
          let count = headlineMatch ? 1 : 0;
          let source: "content" | "headline" | "none" = headlineMatch ? "headline" : "none";

          // Fetch URL for full content search
          if (row.URL) {
            try {
              const res = await fetch("/api/search-articles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: row.URL, term }),
              });
              const data = await res.json();
              if (!data.fetchFailed && data.count > 0) {
                found = true;
                count = data.count;
                source = "content";
              }
            } catch { /* fallback to headline result */ }
          }

          setRows((prev) => {
            const updated = [...prev];
            updated[globalIdx] = {
              ...updated[globalIdx],
              _checked: true,
              _found: found,
              _count: count,
              _source: source,
            };
            return updated;
          });

          setProgress((p) => p + 1);
        })
      );
    }

    setIsSearching(false);
    setHasSearched(true);
  };

  const reset = () => {
    setRows([]); setFileName(""); setSearchTerm("");
    setHasSearched(false); setProgress(0); setUploadError("");
  };

  // ── Derived ───────────────────────────────────────────
  const pct = rows.length > 0 ? Math.round((progress / rows.length) * 100) : 0;
  const results = rows.filter((r) => r._found);
  const checked = rows.filter((r) => r._checked).length;

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-[52px]">

        {/* Sub-header */}
        <div className="border-b border-border bg-card shadow-sm">
          <div className="w-full px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <a href="/dashboard"
                className="flex items-center gap-1.5 text-text-muted hover:text-primary transition-colors text-xs">
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </a>
              <span className="text-border">|</span>
              <div>
                <h1 className="text-base font-bold text-text-base flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" /> Pesquisa de Termos
                </h1>
                <p className="text-text-muted text-xs mt-0.5">
                  Carregue uma planilha e pesquise um termo em todas as matérias
                </p>
              </div>
            </div>
            {rows.length > 0 && (
              <button onClick={reset}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary border border-border rounded-lg px-3 py-1.5 bg-card transition-all hover:border-primary/50">
                <RefreshCw className="w-3 h-3" /> Nova pesquisa
              </button>
            )}
          </div>
        </div>

        <div className="w-full px-4 py-6 max-w-5xl mx-auto">

          {/* ── Upload ── */}
          {rows.length === 0 && (
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(74,123,30,0.1)", border: "1px solid rgba(74,123,30,0.25)" }}>
                  <Search className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-text-base">Pesquisa de Termos</h2>
                <p className="text-text-muted text-sm mt-1">
                  Carregue sua planilha de clipping e pesquise qualquer palavra ou frase
                  diretamente no conteúdo de cada matéria
                </p>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragActive ? "border-accent bg-green-50" :
                  isUploading ? "border-border opacity-60 cursor-not-allowed" :
                  "border-border hover:border-primary/60 hover:bg-card"
                }`}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-9 h-9 text-primary animate-spin" />
                    <p className="text-text-muted text-sm">Carregando planilha…</p>
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
            </div>
          )}

          {/* ── Search form ── */}
          {rows.length > 0 && (
            <div className="mb-5">
              <div className="bg-card border border-border rounded-xl p-4 mb-4 flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-base truncate">{fileName}</p>
                  <p className="text-xs text-text-muted">{rows.length} matérias carregadas</p>
                </div>
                {hasSearched && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "#E3F4D0", color: "#3A7015", border: "1px solid #A8D880" }}>
                    {results.length} encontradas
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isSearching && runSearch()}
                    placeholder="Digite o termo para pesquisar nas matérias…"
                    disabled={isSearching}
                    className="w-full pl-9 pr-4 py-2.5 bg-bg border border-border rounded-xl text-text-base text-sm focus:outline-none focus:border-primary transition-colors placeholder-text-muted/50"
                  />
                </div>
                <button
                  onClick={runSearch}
                  disabled={isSearching || !searchTerm.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#4A7B1E" }}
                >
                  {isSearching ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Pesquisando…</>
                  ) : (
                    <><Search className="w-4 h-4" /> Pesquisar</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Progress ── */}
          {isSearching && (
            <div className="mb-5 p-4 rounded-xl bg-card border border-border">
              <div className="flex justify-between text-xs text-text-muted mb-1.5">
                <span>Pesquisando <strong className="text-text-base">"{searchTerm}"</strong> nas matérias…</span>
                <span className="font-medium">{checked}/{rows.length} ({pct}%)</span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, background: "linear-gradient(90deg,#4A7B1E,#5EA818)" }} />
              </div>
              {results.length > 0 && (
                <p className="mt-2 text-xs text-primary font-medium">
                  {results.length} matéria{results.length !== 1 ? "s" : ""} encontrada{results.length !== 1 ? "s" : ""} até agora…
                </p>
              )}
            </div>
          )}

          {/* ── Results ── */}
          {hasSearched && !isSearching && (
            <>
              <div className="flex items-center gap-3 mb-3">
                {results.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-text-base">
                      {results.length} matéria{results.length !== 1 ? "s" : ""} contém <strong>"{searchTerm}"</strong>
                    </span>
                    <span className="text-text-muted text-xs">
                      ({rows.length} verificadas)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-text-muted" />
                    <span className="text-sm text-text-muted">
                      Nenhuma matéria encontrada para <strong>"{searchTerm}"</strong>
                    </span>
                  </div>
                )}
              </div>

              {results.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="overflow-y-auto" style={{ maxHeight: "65vh" }}>
                    <table className="data-table">
                      <colgroup>
                        <col style={{ width: "32px" }} />
                        <col style={{ width: "90px" }} />
                        <col />
                        <col style={{ width: "130px" }} />
                        <col style={{ width: "96px" }} />
                        <col style={{ width: "68px" }} />
                        <col style={{ width: "78px" }} />
                        <col style={{ width: "82px" }} />
                        <col style={{ width: "80px" }} />
                        <col style={{ width: "70px" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="text-center">#</th>
                          <th>Date</th>
                          <th>Headline</th>
                          <th>URL</th>
                          <th>Source</th>
                          <th>Country</th>
                          <th className="text-right">Reach</th>
                          <th className="text-right">AVE</th>
                          <th>Sentiment</th>
                          <th className="text-center">Menções</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((row, idx) => {
                          const ave = fmtAVE(row.AVE);
                          const s = (row.Sentiment || "").toLowerCase();
                          return (
                            <tr key={idx}>
                              <td className="text-center text-text-muted font-mono select-none">{idx + 1}</td>
                              <td className="text-text-muted" title={row.Date || ""}>{row.Date || "—"}</td>
                              <td title={row.Headline || ""}>
                                <span className="text-text-base font-medium">{row.Headline || "—"}</span>
                              </td>
                              <td>
                                {row.URL ? (
                                  <a href={row.URL} target="_blank" rel="noopener noreferrer" title={row.URL}
                                    className="text-primary hover:text-accent transition-colors hover:underline text-xs">
                                    {row.URL.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                                  </a>
                                ) : "—"}
                              </td>
                              <td className="text-text-muted" title={row.Source || ""}>{row.Source || "—"}</td>
                              <td>
                                <span className="badge badge-neutral text-xs">{row.Country || "—"}</span>
                              </td>
                              <td className="text-right font-mono text-text-base text-xs">
                                {row.Reach ? Number(row.Reach).toLocaleString("pt-BR") : "—"}
                              </td>
                              <td className="text-right font-mono text-text-base text-xs" title={ave.full}>
                                {ave.display}
                              </td>
                              <td>
                                {s === "positive" ? <span className="badge badge-with text-xs">Positivo</span>
                                 : s === "negative" ? <span className="badge badge-without text-xs">Negativo</span>
                                 : s === "neutral" ? <span className="badge badge-neutral text-xs">Neutro</span>
                                 : <span className="text-text-muted text-xs">{row.Sentiment || "—"}</span>}
                              </td>
                              <td className="text-center">
                                <span className="font-bold text-xs px-1.5 py-0.5 rounded"
                                  style={{ background: "#E3F4D0", color: "#3A7015" }}>
                                  {row._count}x
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 border-t border-border bg-card flex items-center justify-between">
                    <span className="text-text-muted text-xs">
                      {results.length} resultado{results.length !== 1 ? "s" : ""} para "{searchTerm}"
                    </span>
                    <span className="text-text-muted text-xs">Role para ver todos ↕</span>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}
