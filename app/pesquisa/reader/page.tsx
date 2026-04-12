"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";

interface ArticleData {
  title: string;
  subtitle: string;
  paragraphs: string[];
  count: number;
  sourceUrl: string;
}

function ReaderContent() {
  const params = useSearchParams();
  const url  = params.get("url")  || "";
  const term = params.get("term") || "";

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const firstMarkRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!url) { setError("URL não informada."); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/search-articles/reader?url=${encodeURIComponent(url)}&term=${encodeURIComponent(term)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setArticle(data);
      })
      .catch(() => setError("Não foi possível carregar o artigo. O site pode bloquear acesso externo."))
      .finally(() => setLoading(false));
  }, [url, term]);

  // Scroll to the first <mark> after render
  useEffect(() => {
    if (!article) return;
    requestAnimationFrame(() => {
      const mark = document.querySelector("mark") as HTMLElement | null;
      if (mark) {
        firstMarkRef.current = mark;
        mark.scrollIntoView({ behavior: "smooth", block: "center" });
        mark.style.outline = "3px solid #5EA818";
        mark.style.outlineOffset = "2px";
        mark.style.borderRadius = "3px";
      }
    });
  }, [article]);

  const domain = url ? url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] : "";

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-[52px]">

        {/* Sub-header */}
        <div className="border-b border-border bg-card shadow-sm">
          <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => window.history.back()}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors flex-shrink-0">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
              {domain && (
                <>
                  <span className="text-border hidden sm:inline">|</span>
                  <span className="text-xs text-text-muted truncate">{domain}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {term && (
                <span className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: "rgba(94,168,24,0.15)", color: "#5EA818", border: "1px solid rgba(94,168,24,0.3)" }}>
                  "{term}" {article ? `· ${article.count}x` : ""}
                </span>
              )}
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-text-muted hover:text-primary hover:border-primary/50 transition-all">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Abrir original</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="w-full px-4 sm:px-6 py-8 max-w-3xl mx-auto">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-text-muted text-sm">Carregando artigo…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="p-4 rounded-xl flex items-start gap-3"
              style={{ background: "#FDECEC", border: "1px solid #F5B8B8" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#C0392B" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "#C0392B" }}>{error}</p>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="text-xs underline mt-1 block" style={{ color: "#C0392B" }}>
                    Abrir a matéria original →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Article */}
          {article && !loading && (
            <article className="flex flex-col gap-5">

              {/* Title */}
              {article.title && (
                <h1
                  className="text-2xl sm:text-3xl font-bold text-text-base leading-tight"
                  dangerouslySetInnerHTML={{ __html: article.title }}
                />
              )}

              {/* Subtitle */}
              {article.subtitle && (
                <p
                  className="text-base text-text-muted leading-relaxed border-l-4 pl-4"
                  style={{ borderColor: "#5EA818" }}
                  dangerouslySetInnerHTML={{ __html: article.subtitle }}
                />
              )}

              {/* Divider */}
              <div className="h-px bg-border" />

              {/* Body paragraphs */}
              <div className="flex flex-col gap-4">
                {article.paragraphs.map((para, i) => (
                  <p
                    key={i}
                    className="text-text-base leading-relaxed text-sm sm:text-base"
                    dangerouslySetInnerHTML={{ __html: para }}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-text-muted">Fonte: {domain}</span>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <ExternalLink className="w-3 h-3" />
                  Ver matéria original
                </a>
              </div>
            </article>
          )}

        </div>
      </main>

      {/* Mark styles */}
      <style>{`
        mark {
          background-color: #fef08a;
          color: inherit;
          border-radius: 2px;
          padding: 0 2px;
        }
      `}</style>
    </div>
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
