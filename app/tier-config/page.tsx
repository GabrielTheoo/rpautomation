"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Plus, Trash2, Save, Info, Search, ChevronUp, ChevronDown,
  FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Loader2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import type { TierEntry } from "@/lib/types";

const STORAGE_KEY = "rpautomation_tiers";

const TIER_COLORS = {
  1: { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent", label: "Tier 1", desc: "Veículos de maior alcance e relevância" },
  2: { bg: "bg-primary/10", border: "border-primary/30", text: "text-primary", label: "Tier 2", desc: "Veículos de médio alcance" },
  3: { bg: "bg-text-muted/10", border: "border-text-muted/20", text: "text-text-muted", label: "Tier 3", desc: "Veículos de menor alcance" },
};

function generateId() { return Math.random().toString(36).slice(2, 10); }

export default function TierConfig() {
  const [entries, setEntries] = useState<TierEntry[]>([]);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [newEntry, setNewEntry] = useState<{ keyword: string; name: string; tier: 1 | 2 | 3 }>({
    keyword: "", name: "", tier: 1,
  });
  const [addError, setAddError] = useState("");
  const [sortField, setSortField] = useState<"tier" | "name" | "keyword">("tier");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { try { setEntries(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  const saveToStorage = (data: TierEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAdd = () => {
    setAddError("");
    if (!newEntry.keyword.trim()) { setAddError("Keyword é obrigatória."); return; }
    if (!newEntry.name.trim()) { setAddError("Nome é obrigatório."); return; }
    if (entries.some((e) => e.keyword.toLowerCase() === newEntry.keyword.trim().toLowerCase())) {
      setAddError("Já existe uma entrada com essa keyword."); return;
    }
    const entry: TierEntry = { id: generateId(), keyword: newEntry.keyword.trim().toLowerCase(), name: newEntry.name.trim(), tier: newEntry.tier };
    const updated = [...entries, entry];
    setEntries(updated);
    saveToStorage(updated);
    setNewEntry({ keyword: "", name: "", tier: 1 });
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveToStorage(updated);
  };

  const handleTierChange = (id: string, tier: 1 | 2 | 3) => {
    const updated = entries.map((e) => (e.id === id ? { ...e, tier } : e));
    setEntries(updated);
    saveToStorage(updated);
  };

  const toggleSort = (field: "tier" | "name" | "keyword") => {
    if (sortField === field) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); }
    else { setSortField(field); setSortDir("asc"); }
  };

  const onImportDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setIsImporting(true); setImportError(""); setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/tier-import", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Falha ao processar planilha");
      const data = await res.json();
      const imported: Array<{ name: string; keyword: string; tier: 1 | 2 | 3 }> = data.entries || [];
      let added = 0, skipped = 0;
      const updated = [...entries];
      for (const item of imported) {
        const exists = updated.some((e) => e.keyword.toLowerCase() === item.keyword.toLowerCase());
        if (exists) { skipped++; } else { updated.push({ id: generateId(), ...item }); added++; }
      }
      setEntries(updated);
      saveToStorage(updated);
      setImportResult({ added, skipped });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsImporting(false);
    }
  }, [entries]);

  const { getRootProps: getImportRootProps, getInputProps: getImportInputProps, isDragActive: isImportDragActive } = useDropzone({
    onDrop: onImportDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    disabled: isImporting,
  });

  const filtered = entries
    .filter((e) => !search || e.keyword.includes(search.toLowerCase()) || e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "tier") cmp = a.tier - b.tier;
      else if (sortField === "name") cmp = a.name.localeCompare(b.name, "pt-BR");
      else cmp = a.keyword.localeCompare(b.keyword, "pt-BR");
      return sortDir === "asc" ? cmp : -cmp;
    });

  const SortIcon = ({ field }: { field: "tier" | "name" | "keyword" }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-accent" /> : <ChevronDown className="w-3 h-3 text-accent" />;
  };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-14">
        <div className="border-b border-border bg-card/50">
          <div className="max-w-screen-xl mx-auto px-6 py-5">
            <h1 className="text-lg font-bold text-text-base">Configuração de Tiers</h1>
            <p className="text-text-muted text-sm mt-0.5">Defina as keywords e mídias para classificação automática de tier</p>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-8">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {([1, 2, 3] as const).map((t) => {
              const cfg = TIER_COLORS[t];
              const count = entries.filter((e) => e.tier === t).length;
              return (
                <div key={t} className={`rounded-xl p-4 border ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold text-sm ${cfg.text}`}>{cfg.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>{count} veículos</span>
                  </div>
                  <p className="text-text-muted text-xs">{cfg.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-text-base mb-1 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-accent" />Importar via Planilha</h2>
            <p className="text-text-muted text-xs mb-4">A planilha deve ter colunas <strong>Nome</strong>, <strong>Keyword</strong> e <strong>Tier</strong> (1, 2 ou 3). Keywords duplicadas são ignoradas.</p>
            <div {...getImportRootProps()} className={`border-2 border-dashed rounded-xl px-6 py-5 text-center cursor-pointer transition-all ${
              isImportDragActive ? "border-accent bg-green-50" : isImporting ? "border-border opacity-60 cursor-not-allowed" : "border-border hover:border-primary/60 hover:bg-bg"
            }`}>
              <input {...getImportInputProps()} />
              {isImporting ? (
                <div className="flex items-center justify-center gap-2 text-text-muted text-sm"><Loader2 className="w-4 h-4 animate-spin" />Processando planilha…</div>
              ) : isImportDragActive ? (
                <div className="flex items-center justify-center gap-2 text-accent text-sm font-medium"><Upload className="w-4 h-4" />Solte aqui</div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
                  <Upload className="w-4 h-4" />Arraste ou <span className="text-primary underline cursor-pointer">clique para selecionar</span> — CSV ou XLSX
                </div>
              )}
            </div>
            {importResult && (
              <div className="mt-3 p-3 rounded-xl flex items-center gap-3" style={{ background: "#E3F4D0", border: "1px solid #A8D880" }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-primary" />
                <p className="text-sm text-primary"><strong>{importResult.added}</strong> veículo{importResult.added !== 1 ? "s" : ""} importado{importResult.added !== 1 ? "s" : ""}
                  {importResult.skipped > 0 && <span className="text-text-muted ml-1">• {importResult.skipped} ignorado{importResult.skipped !== 1 ? "s" : ""} (keyword já existe)</span>}
                </p>
              </div>
            )}
            {importError && (
              <div className="mt-3 p-3 rounded-xl flex items-center gap-3" style={{ background: "#FDECEC", border: "1px solid #F5B8B8" }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#C0392B" }} />
                <p className="text-sm" style={{ color: "#C0392B" }}>{importError}</p>
              </div>
            )}
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-text-base mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-accent" />Adicionar Veículo / Keyword</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-text-muted text-xs mb-1.5">Nome do Veículo</label>
                <input type="text" placeholder="ex: Panorama Farmacêutico" value={newEntry.name}
                  onChange={(e) => setNewEntry((n) => ({ ...n, name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text-base text-sm focus:outline-none focus:border-primary placeholder-text-muted/50 transition-colors" />
              </div>
              <div>
                <label className="block text-text-muted text-xs mb-1.5">Keyword no URL <span className="ml-1 text-text-muted cursor-help" title="Trecho que aparece na URL do veículo"><Info className="w-3 h-3 inline" /></span></label>
                <input type="text" placeholder="ex: panoramafarmaceutico" value={newEntry.keyword}
                  onChange={(e) => setNewEntry((n) => ({ ...n, keyword: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text-base text-sm focus:outline-none focus:border-primary placeholder-text-muted/50 transition-colors font-mono" />
              </div>
              <div>
                <label className="block text-text-muted text-xs mb-1.5">Tier</label>
                <select value={newEntry.tier} onChange={(e) => setNewEntry((n) => ({ ...n, tier: Number(e.target.value) as 1 | 2 | 3 }))}
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text-base text-sm focus:outline-none focus:border-primary transition-colors">
                  <option value={1}>Tier 1 — Alto alcance</option>
                  <option value={2}>Tier 2 — Médio alcance</option>
                  <option value={3}>Tier 3 — Menor alcance</option>
                </select>
              </div>
            </div>
            {addError && <p className="text-red-400 text-xs mb-3">{addError}</p>}
            <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-bg font-semibold text-sm hover:bg-primary-dark transition-all">
              <Plus className="w-4 h-4" />Adicionar
            </button>
            {saved && <span className="ml-3 text-accent text-sm flex-inline items-center gap-1"><Save className="w-3.5 h-3.5 inline" /> Salvo!</span>}
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
              <input type="text" placeholder="Buscar por nome ou keyword…" value={search} onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-text-base text-sm focus:outline-none placeholder-text-muted/50" />
              <span className="text-text-muted text-xs">{filtered.length} / {entries.length}</span>
            </div>
            {entries.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-xl bg-border/50 flex items-center justify-center mx-auto mb-3"><Plus className="w-5 h-5 text-text-muted" /></div>
                <p className="text-text-muted font-medium">Nenhum veículo cadastrado</p>
                <p className="text-text-muted text-sm mt-1">Adicione veículos acima ou importe uma planilha</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold">
                      <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-text-base transition-colors">Nome <SortIcon field="name" /></button>
                    </th>
                    <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold">
                      <button onClick={() => toggleSort("keyword")} className="flex items-center gap-1 hover:text-text-base transition-colors">Keyword no URL <SortIcon field="keyword" /></button>
                    </th>
                    <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold">
                      <button onClick={() => toggleSort("tier")} className="flex items-center gap-1 hover:text-text-base transition-colors">Tier <SortIcon field="tier" /></button>
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => {
                    const cfg = TIER_COLORS[entry.tier];
                    return (
                      <tr key={entry.id} className="border-b border-border hover:bg-card-hover transition-colors">
                        <td className="px-4 py-3 text-text-base text-sm font-medium">{entry.name}</td>
                        <td className="px-4 py-3"><code className="text-accent text-xs bg-accent/10 px-2 py-0.5 rounded-lg">{entry.keyword}</code></td>
                        <td className="px-4 py-3">
                          <select value={entry.tier} onChange={(e) => handleTierChange(entry.id, Number(e.target.value) as 1 | 2 | 3)}
                            className={`text-xs font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                            <option value={1}>Tier 1</option><option value={2}>Tier 2</option><option value={3}>Tier 3</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all" title="Remover">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-4 p-4 rounded-xl bg-card border border-border flex items-start gap-3">
            <Info className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
            <p className="text-text-muted text-xs">A <strong className="text-text-base">keyword</strong> é qualquer trecho único que aparece na URL do veículo. Exemplo: para <code className="text-primary">https://panoramafarmaceutico.com.br/...</code>, use <code className="text-accent">panoramafarmaceutico</code>. O sistema buscará esse trecho em cada URL da planilha e atribuirá o tier correspondente automaticamente.</p>
          </div>
        </div>
      </main>
    </div>
  );
}