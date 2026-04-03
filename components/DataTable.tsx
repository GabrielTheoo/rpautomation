"use client";

import { useRef } from "react";
import type { ProcessedRow } from "@/lib/types";

interface Props {
  rows: Partial<ProcessedRow>[];
  showProcessedColumns?: boolean;
  onProactiveChange?: (index: number, value: "Proactive" | "Spontaneous") => void;
  onTierChange?: (index: number, value: "1" | "2" | "3" | "") => void;
  onImpactChange?: (index: number, value: "With Impact" | "Without Impact" | "") => void;
  onSentimentChange?: (index: number, value: string) => void;
}

function fmtAVE(val: string | number | undefined | null) {
  const n = parseFloat(String(val ?? "").replace(/[$,\s]/g, "")) || 0;
  if (!val || n === 0) return { display: "—", full: "—", short: false };
  const full = `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 1_000_000_000) return { display: `$ ${(n / 1_000_000_000).toFixed(2)}B`, full, short: true };
  if (n >= 1_000_000)     return { display: `$ ${(n / 1_000_000).toFixed(2)}M`, full, short: true };
  return { display: full, full, short: false };
}

function isBrazil(country: string | number | undefined): boolean {
  const c = String(country || "").toLowerCase().trim();
  return c.includes("brazil") || c.includes("brasil");
}

function TierBadge({ tier }: { tier: string }) {
  if (!tier) return <span className="text-text-muted">—</span>;
  const cls = tier === "1" ? "badge-tier-1" : tier === "2" ? "badge-tier-2" : "badge-tier-3";
  return <span className={`badge ${cls}`}>Tier {tier}</span>;
}

function ImpactBadge({ impact }: { impact: string }) {
  if (!impact) return <span className="text-text-muted">—</span>;
  if (impact === "Checking...") return <span className="badge badge-checking animate-pulse-green">⏳ Verificando</span>;
  if (impact === "Error") return <span className="badge badge-error">⚠ Erro</span>;
  if (impact === "With Impact") return <span className="badge badge-with">✓ Com Impacto</span>;
  return <span className="badge badge-without">✗ Sem Impacto</span>;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const s = sentiment?.toLowerCase() || "";
  if (s === "positive") return <span className="badge badge-with">Positivo</span>;
  if (s === "negative") return <span className="badge badge-without">Negativo</span>;
  if (s === "neutral") return <span className="badge badge-neutral">Neutro</span>;
  return <span className="text-text-muted text-xs">{sentiment || "—"}</span>;
}

const SELECT_CLS =
  "w-full bg-white border border-border text-text-base text-sm rounded-md px-1.5 py-1 " +
  "focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer";

const EMPTY_CLS =
  "w-full bg-gray-50 border border-gray-200 text-gray-300 text-sm rounded-md px-1.5 py-1 cursor-not-allowed";

export default function DataTable({
  rows,
  showProcessedColumns = false,
  onProactiveChange,
  onTierChange,
  onImpactChange,
  onSentimentChange,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted rounded-xl border border-border bg-card">
        Nenhum dado encontrado.
      </div>
    );
  }

  // Country separator: track when country changes for visual grouping
  let prevCountry = "";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "65vh" }}>
        <table className="data-table">
          <colgroup>
            <col /> {/* # */}
            <col /> {/* Date */}
            <col /> {/* Headline */}
            <col /> {/* URL */}
            <col /> {/* Source */}
            <col /> {/* Country */}
            <col /> {/* Reach */}
            <col /> {/* AVE */}
            <col /> {/* Sentiment */}
            {showProcessedColumns && (
              <>
                <col />
                <col />
                <col />
              </>
            )}
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
              {showProcessedColumns && (
                <>
                  <th>Proativo / Espontâneo</th>
                  <th>Impacto</th>
                  <th>Tier</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const processed = row as ProcessedRow;
              const brazil = isBrazil(row.Country);
              const country = String(row.Country || "");

              // Show a separator row when country changes
              const showSeparator = showProcessedColumns && country !== prevCountry && idx > 0;
              prevCountry = country;

              return (
                <>
                  {showSeparator && (
                    <tr key={`sep-${idx}`} style={{ background: "#F0F5EE" }}>
                      <td
                        colSpan={showProcessedColumns ? 12 : 9}
                        className="py-1.5 px-3 text-xs font-semibold text-primary border-t-2"
                        style={{ borderTopColor: "#DDE8D8" }}
                      >
                        {country || "—"}
                      </td>
                    </tr>
                  )}
                  <tr key={idx} style={!brazil && showProcessedColumns ? { background: "#FAFBFA" } : {}}>
                    {/* # */}
                    <td className="text-center text-text-muted font-mono select-none">{idx + 1}</td>

                    {/* Date */}
                    <td className="text-text-muted" title={row.Date || ""}>{row.Date || "—"}</td>

                    {/* Headline */}
                    <td title={row.Headline || ""}>
                      <span className="text-text-base font-medium">{row.Headline || "—"}</span>
                    </td>

                    {/* URL */}
                    <td>
                      {row.URL ? (
                        <a href={row.URL} target="_blank" rel="noopener noreferrer" title={row.URL}
                          className="text-primary hover:text-accent transition-colors hover:underline">
                          {row.URL.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                        </a>
                      ) : "—"}
                    </td>

                    {/* Source */}
                    <td className="text-text-muted" title={row.Source || ""}>{row.Source || "—"}</td>

                    {/* Country */}
                    <td>
                      {brazil ? (
                        <span className="badge badge-with">{country}</span>
                      ) : (
                        <span className="badge badge-neutral">{country || "—"}</span>
                      )}
                    </td>

                    {/* Reach */}
                    <td className="text-right font-mono text-text-base">
                      {row.Reach ? Number(row.Reach).toLocaleString("pt-BR") : "—"}
                    </td>

                    {/* AVE */}
                    {(() => { const ave = fmtAVE(row.AVE); return (
                      <td className="text-right font-mono text-text-base" title={ave.short ? ave.full : undefined}>
                        <span className={ave.short ? "cursor-help underline decoration-dotted decoration-text-muted" : ""}>
                          {ave.display}
                        </span>
                      </td>
                    ); })()}

                    {/* Sentiment — always editable */}
                    <td>
                      {onSentimentChange ? (
                        <select
                          value={row.Sentiment || ""}
                          onChange={(e) => onSentimentChange(idx, e.target.value)}
                          className={SELECT_CLS}
                        >
                          <option value="">—</option>
                          <option value="Positive">Positivo</option>
                          <option value="Negative">Negativo</option>
                          <option value="Neutral">Neutro</option>
                        </select>
                      ) : (
                        <SentimentBadge sentiment={row.Sentiment || ""} />
                      )}
                    </td>

                    {/* Processed columns */}
                    {showProcessedColumns && (
                      <>
                        {/* Proactive or Spontaneous — blank for non-Brazil */}
                        <td>
                          {brazil && onProactiveChange ? (
                            <select
                              value={processed["Proactive or Spontaneous"] || ""}
                              onChange={(e) => onProactiveChange(idx, e.target.value as "Proactive" | "Spontaneous")}
                              className={SELECT_CLS}
                            >
                              <option value="">— Selecionar —</option>
                              <option value="Proactive">Proativo</option>
                              <option value="Spontaneous">Espontâneo</option>
                            </select>
                          ) : (
                            <span className="text-gray-300 text-xs select-none">—</span>
                          )}
                        </td>

                        {/* Impact — editable for all, but blank for non-Brazil */}
                        <td>
                          {brazil ? (
                            onImpactChange ? (
                              <select
                                value={
                                  processed["With Impact or Without Impact"] === "Checking..." ||
                                  processed["With Impact or Without Impact"] === "Error"
                                    ? ""
                                    : processed["With Impact or Without Impact"] || ""
                                }
                                onChange={(e) =>
                                  onImpactChange(idx, e.target.value as "With Impact" | "Without Impact" | "")
                                }
                                className={SELECT_CLS}
                              >
                                <option value="">— Selecionar —</option>
                                <option value="With Impact">Com Impacto</option>
                                <option value="Without Impact">Sem Impacto</option>
                              </select>
                            ) : (
                              <ImpactBadge impact={processed["With Impact or Without Impact"] || ""} />
                            )
                          ) : (
                            <span className="text-gray-300 text-xs select-none">—</span>
                          )}
                        </td>

                        {/* Tier — editable, blank for non-Brazil */}
                        <td>
                          {brazil && onTierChange ? (
                            <select
                              value={processed.Tier || ""}
                              onChange={(e) => onTierChange(idx, e.target.value as "1" | "2" | "3" | "")}
                              className={SELECT_CLS}
                            >
                              <option value="">—</option>
                              <option value="1">Tier 1</option>
                              <option value="2">Tier 2</option>
                              <option value="3">Tier 3</option>
                            </select>
                          ) : (
                            <span className="text-gray-300 text-xs select-none">—</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-card flex items-center justify-between">
        <span className="text-text-muted text-xs">
          {rows.length} {rows.length === 1 ? "registro" : "registros"}
          {showProcessedColumns && (
            <span className="ml-2 text-gray-400">
              • Linhas sem fundo = fora do Brasil (campos automáticos desativados)
            </span>
          )}
        </span>
        <span className="text-text-muted text-xs">Role para ver todos ↕</span>
      </div>
    </div>
  );
}
