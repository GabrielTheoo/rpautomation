"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Pencil, X, Save, Trash2, Rocket, CheckCircle2, Loader2, Eye } from "lucide-react";

interface Override {
  page_key: string;
  element_key: string;
  text_content: string | null;
  text_color: string | null;
  bg_color: string | null;
}

interface EditTarget {
  key: string;
  label: string;
  el: HTMLElement;
  originalText: string;
  currentText: string;
  textColor: string;
  bgColor: string;
}

const PAGE_KEY = "admin";

export default function PageEditor({ pageKey = PAGE_KEY }: { pageKey?: string }) {
  const [editMode, setEditMode] = useState(false);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<"idle" | "ok" | "err">("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "ok">("idle");
  const handlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  // Fetch and apply overrides on mount
  const fetchAndApply = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overrides");
      if (!res.ok) return;
      const data = await res.json();
      const list: Override[] = data.overrides ?? [];
      setOverrides(list);
      // Apply to DOM
      list.forEach(ov => {
        const el = document.querySelector(`[data-ek="${ov.element_key}"]`) as HTMLElement | null;
        if (!el) return;
        if (ov.text_content !== null) el.textContent = ov.text_content;
        if (ov.text_color) el.style.color = ov.text_color;
        if (ov.bg_color) el.style.backgroundColor = ov.bg_color;
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchAndApply(); }, [fetchAndApply]);

  // Edit mode click handler
  useEffect(() => {
    if (!editMode) {
      if (handlerRef.current) document.removeEventListener("click", handlerRef.current, true);
      return;
    }
    const handler = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("[data-ek]") as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const key = el.getAttribute("data-ek") ?? "";
      const label = el.getAttribute("data-ek-label") ?? key;
      const existing = overrides.find(o => o.element_key === key);
      setTarget({
        key,
        label,
        el,
        originalText: el.getAttribute("data-ek-original") ?? el.textContent ?? "",
        currentText: existing?.text_content ?? el.textContent ?? "",
        textColor: existing?.text_color ?? el.style.color ?? "",
        bgColor: existing?.bg_color ?? el.style.backgroundColor ?? "",
      });
    };
    handlerRef.current = handler;
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [editMode, overrides]);

  // Store original text on first mount for each editable element
  useEffect(() => {
    document.querySelectorAll("[data-ek]").forEach(el => {
      if (!el.getAttribute("data-ek-original")) {
        el.setAttribute("data-ek-original", (el as HTMLElement).textContent ?? "");
      }
    });
  }, []);

  const saveOverride = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await fetch("/api/admin/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_key: pageKey,
          element_key: target.key,
          text_content: target.currentText,
          text_color: target.textColor || null,
          bg_color: target.bgColor || null,
        }),
      });
      // Apply to DOM immediately
      target.el.textContent = target.currentText;
      if (target.textColor) target.el.style.color = target.textColor;
      else target.el.style.removeProperty("color");
      if (target.bgColor) target.el.style.backgroundColor = target.bgColor;
      else target.el.style.removeProperty("background-color");
      await fetchAndApply();
      setSaveStatus("ok");
      setTimeout(() => { setSaveStatus("idle"); setTarget(null); }, 1200);
    } finally { setSaving(false); }
  };

  const removeOverride = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await fetch("/api/admin/overrides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_key: pageKey, element_key: target.key }),
      });
      // Restore original
      const orig = target.el.getAttribute("data-ek-original") ?? "";
      target.el.textContent = orig;
      target.el.style.removeProperty("color");
      target.el.style.removeProperty("background-color");
      await fetchAndApply();
      setTarget(null);
    } finally { setSaving(false); }
  };

  const triggerDeploy = async () => {
    setDeploying(true); setDeployStatus("idle");
    try {
      const res = await fetch("/api/admin/deploy", { method: "POST" });
      setDeployStatus(res.ok ? "ok" : "err");
    } catch { setDeployStatus("err"); }
    finally { setDeploying(false); setTimeout(() => setDeployStatus("idle"), 4000); }
  };

  return (
    <>
      {/* Edit mode styles */}
      {editMode && (
        <style>{`
          [data-ek] {
            outline: 2px dashed rgba(94,168,24,0.5) !important;
            outline-offset: 2px;
            cursor: crosshair !important;
            transition: outline-color 0.15s;
          }
          [data-ek]:hover {
            outline-color: #5EA818 !important;
            background-color: rgba(94,168,24,0.08) !important;
          }
        `}</style>
      )}

      {/* Floating editor panel */}
      {target && (
        <div
          className="fixed z-[9999] shadow-2xl rounded-2xl overflow-hidden"
          style={{
            bottom: "80px", right: "20px", width: "320px",
            background: "#1a2810", border: "1px solid #3d4c25",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#3d4c25" }}>
            <div className="flex items-center gap-2">
              <Pencil className="w-3.5 h-3.5" style={{ color: "#BBF261" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#BBF261" }}>
                {target.label}
              </span>
            </div>
            <button onClick={() => setTarget(null)} className="p-1 rounded hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" style={{ color: "#8fa870" }} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Text editor */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "#8fa870" }}>Texto</label>
              <textarea
                value={target.currentText}
                onChange={e => setTarget(t => t ? { ...t, currentText: e.target.value } : t)}
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
                style={{ background: "#0f1a07", border: "1px solid #3d4c25", color: "#e8f0d9" }}
              />
            </div>

            {/* Color pickers row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "#8fa870" }}>Cor do texto</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={target.textColor || "#e8f0d9"}
                    onChange={e => setTarget(t => t ? { ...t, textColor: e.target.value } : t)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    style={{ background: "none" }}
                  />
                  <input
                    type="text"
                    value={target.textColor || ""}
                    onChange={e => setTarget(t => t ? { ...t, textColor: e.target.value } : t)}
                    placeholder="#e8f0d9"
                    className="flex-1 rounded px-2 py-1 text-xs focus:outline-none"
                    style={{ background: "#0f1a07", border: "1px solid #3d4c25", color: "#e8f0d9" }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "#8fa870" }}>Cor de fundo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={target.bgColor || "#1a2810"}
                    onChange={e => setTarget(t => t ? { ...t, bgColor: e.target.value } : t)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    style={{ background: "none" }}
                  />
                  <input
                    type="text"
                    value={target.bgColor || ""}
                    onChange={e => setTarget(t => t ? { ...t, bgColor: e.target.value } : t)}
                    placeholder="nenhuma"
                    className="flex-1 rounded px-2 py-1 text-xs focus:outline-none"
                    style={{ background: "#0f1a07", border: "1px solid #3d4c25", color: "#e8f0d9" }}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg p-3" style={{ background: "#0f1a07", border: "1px solid #3d4c25" }}>
              <p className="text-xs mb-1" style={{ color: "#8fa870" }}>Preview</p>
              <span
                className="text-sm font-medium"
                style={{
                  color: target.textColor || undefined,
                  backgroundColor: target.bgColor || undefined,
                  padding: target.bgColor ? "2px 6px" : undefined,
                  borderRadius: target.bgColor ? "4px" : undefined,
                }}
              >
                {target.currentText || "—"}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveOverride}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: saveStatus === "ok" ? "#3A7015" : "#4A7B1E", color: "#fff" }}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                 saveStatus === "ok" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                 <Save className="w-3.5 h-3.5" />}
                {saveStatus === "ok" ? "Salvo!" : "Salvar"}
              </button>
              <button
                onClick={removeOverride}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-red-900/30"
                style={{ border: "1px solid #3d4c25", color: "#8fa870" }}
                title="Remover override e restaurar original"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-2xl"
        style={{ background: "#1a2810", border: "1px solid #3d4c25" }}
      >
        {/* Edit mode toggle */}
        <button
          onClick={() => { setEditMode(e => !e); setTarget(null); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={editMode
            ? { background: "#4A7B1E", color: "#fff", boxShadow: "0 0 12px rgba(74,123,30,0.5)" }
            : { background: "rgba(167,200,113,0.1)", border: "1px solid #3d4c25", color: "#8fa870" }}
        >
          {editMode ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          {editMode ? "Sair da Edição" : "Editar Texto"}
        </button>

        {editMode && overrides.length > 0 && (
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(94,168,24,0.15)", color: "#BBF261" }}>
            {overrides.length} override{overrides.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* Divider */}
        <div className="w-px h-5" style={{ background: "#3d4c25" }} />

        {/* Deploy button */}
        <button
          onClick={triggerDeploy}
          disabled={deploying}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={
            deployStatus === "ok" ? { background: "#3A7015", color: "#fff" } :
            deployStatus === "err" ? { background: "#7f1d1d", color: "#fca5a5" } :
            { background: "rgba(167,200,113,0.1)", border: "1px solid #3d4c25", color: "#8fa870" }
          }
        >
          {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
          {deployStatus === "ok" ? "Deploy iniciado!" :
           deployStatus === "err" ? "Erro no deploy" :
           deploying ? "Publicando..." : "Publicar na Vercel"}
        </button>
      </div>
    </>
  );
}
