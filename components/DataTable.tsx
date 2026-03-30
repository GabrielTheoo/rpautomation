"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProcessedRow } from "@/lib/types";

interface Props {
  rows: Partial<ProcessedRow>[];
  showProcessedColumns?: boolean;
  onProactiveChange?: (index: number, value: "Proactive" | "Spontaneous") => void;
}

const PAGE_SIZE = 15;

function TierBadge({ tier }: { tier: string }) {
  if (!tier || tier === "") return <span className="text-text-muted">—</span>;
  if (tier === "N/A") return <span className="text-text-muted text-xs">N/A</span>;
  const cls = tier==="1"?"badge-tier-1":tier==="2"?"badge-tier-2":"badge-tier-3";
  return <span className={`badge-impact ${cls}`}>Tier {tier}</span>;
}

function ImpactBadge({ impact }: { impact: string }) {
  if (!impact) return <span className="text-text-muted text-xs">—</span>;
  if (impact==="Checking...") return <span className="badge-impact badge-checking animate-pulse-green">⏳ Verificando</span>;
  if (impact==="Error") return <span className="badge-impact badge-error">⚠ Erro</span>;
  if (impact==="With Impact") return <span className="badge-impact badge-with">✓ Com Impacto</span>;
  return <span className="badge-impact badge-without">✗ Sem Impacto</span>;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const s = sentiment?.toLowerCase() || "";
  if (s==="positive") return <span className="badge-impact badge-with">Positivo</span>;
  if (s==="negative") return <span className="badge-impact badge-without">Negativo</span>;
  return <span className="badge-impact badge-checking">{sentiment || "—"}</span>;
}

export default function DataTable({ rows, showProcessedColumns = false, onProactiveChange }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const baseColumns = ["Date","Headline","URL","Source","Country","Reach","AVE","Sentiment"];
  const processedColumns = showProcessedColumns ? ["Proactive or Spontaneous","With Impact or Without Impact","Tier"] : [];
  const allColumns = [...baseColumns, ...processedColumns];

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto rounded-xl border border-border">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-8 text-center text-text-muted">#</th>
              {allColumns.map((col) => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const globalIdx = page * PAGE_SIZE + i;
              return (
                <tr key={globalIdx}>
                  <td className="text-center text-text-muted text-xs">{globalIdx + 1}</td>
                  <td className="text-text-muted text-xs">{row.Date || "—"}</td>
                  <td><span className="text-text-base" title={row.Headline}>{row.Headline ? (row.Headline.length>60 ? row.Headline.slice(0,60)+"…" : row.Headline) : "—"}</span></td>
                  <td>{row.URL ? <a href={row.URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-accent transition-colors text-xs truncate block max-w-[160px]" title={row.URL}>{row.URL.replace(/^https?:\/\//,"").slice(0,40)}…</a> : "—"}</td>
                  <td className="text-text-muted text-xs">{row.Source || "—"}</td>
                  <td className="text-text-muted text-xs">{row.Country || "—"}</td>
                  <td className="text-right text-text-base text-xs font-mono">{row.Reach ? Number(row.Reach).toLocaleString("pt-BR") : "—"}</td>
                  <td className="text-right text-text-base text-xs font-mono">{row.AVE ? `R$ ${Number(row.AVE).toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—"}</td>
                  <td><SentimentBadge sentiment={row.Sentiment || ""} /></td>
                  {showProcessedColumns && (
                    <>
                      <td>{onProactiveChange ? (
                        <select value={(row as ProcessedRow)["Proactive or Spontaneous"] || ""} onChange={(e) => onProactiveChange(globalIdx, e.target.value as "Proactive"|"Spontaneous")} className="bg-card border border-border text-text-base text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-primary transition-colors">
                          <option value="">Selecionar</option>
                          <option value="Proactive">Proativo</option>
                          <option value="Spontaneous">Espontâneo</option>
                        </select>
                      ) : <span className="text-text-muted text-xs">{(row as ProcessedRow)["Proactive or Spontaneous"] || "—"}</span>}</td>
                      <td><ImpactBadge impact={(row as ProcessedRow)["With Impact or Without Impact"] || ""} /></td>
                      <td><TierBadge tier={(row as ProcessedRow).Tier || ""} /></td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-center py-12 text-text-muted">Nenhum dado encontrado.</div>}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs">{rows.length} registros • Página {page+1} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(0,p-1))} disabled={page===0} className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-base hover:border-primary/50 disabled:opacity-30 disabled:cursor-default transition-all"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({length: Math.min(5,totalPages)}, (_,i) => {
              let pageNum = i;
              if (totalPages>5) { if(page<3) pageNum=i; else if(page>totalPages-4) pageNum=totalPages-5+i; else pageNum=page-2+i; }
              return <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${page===pageNum?"bg-primary text-bg":"border border-border text-text-muted hover:border-primary/50 hover:text-text-base"}`}>{pageNum+1}</button>;
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-base hover:border-primary/50 disabled:opacity-30 disabled:cursor-default transition-all"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
