import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
  "Cache-Control": "no-cache",
};

// Exact same selectors as /api/search-articles/route.ts — must stay in sync
const ARTICLE_SELECTORS = [
  "[itemprop='articleBody']",
  ".article-body",
  ".article-content",
  ".article__body",
  ".article__content",
  ".article__text",
  ".post-body",
  ".post-content",
  ".entry-content",
  ".story-body",
  ".story-content",
  ".news-body",
  ".news-content",
  ".content-body",
  ".materia-conteudo",
  ".conteudo-materia",
  ".texto-materia",
  "#article-body",
  "#article-content",
  "#post-content",
  "article",
  "main",
];

const NOISE_SELECTORS = [
  "script", "style", "nav", "footer", "header", "aside",
  "[class*='related']", "[class*='recommend']", "[class*='sidebar']",
  "[class*='comentar']", "[class*='comment']", "[class*='social']",
  "[class*='share']", "[class*='newsletter']", "[class*='advertisement']",
  "[class*='banner']", "[class*='ads']",
  "[id*='related']", "[id*='sidebar']", "[id*='comment']", "[id*='ads']", "[id*='newsletter']",
].join(", ");

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightRaw(text: string, term: string): string {
  if (!term || !text) return escapeHtml(text);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return escapeHtml(text).replace(
    new RegExp(`(${escapeHtml(escaped)})`, "gi"),
    (m) => `<mark>${m}</mark>`
  );
}

// Extract article text using IDENTICAL logic as /api/search-articles/route.ts
// This guarantees: if search found the word, reader will find it too.
function extractArticleText($: ReturnType<typeof cheerio.load>): {
  title: string;
  subtitle: string;
  bodyText: string;
} {
  const title = $("h1").first().text().trim();

  const subtitle =
    $("[class*='subtitle'], [class*='subheadline'], [class*='deck'], [class*='chapeu']").first().text().trim() ||
    $("h2").first().text().trim();

  let bodyText = "";
  for (const selector of ARTICLE_SELECTORS) {
    const el = $(selector).first();
    if (el.length && el.text().trim().length > 100) {
      bodyText = el.text().trim();
      break;
    }
  }

  if (!bodyText) {
    bodyText = $("body").text().trim();
  }

  return { title, subtitle, bodyText };
}

// Split full body text into display paragraphs while preserving all content
function toParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url      = searchParams.get("url")      || "";
  const term     = searchParams.get("term")     || "";
  const headline = searchParams.get("headline") || ""; // spreadsheet headline, for fallback

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let html = "";
  try {
    const response = await axios.get(url, {
      timeout: 12000,
      headers: HEADERS,
      maxRedirects: 5,
      maxContentLength: 5 * 1024 * 1024,
    });
    html = typeof response.data === "string" ? response.data : "";
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }

  const $ = cheerio.load(html);
  $(NOISE_SELECTORS).remove();

  const { title, subtitle, bodyText } = extractArticleText($);

  // Count using SAME logic as search API
  const fullText = [title, subtitle, bodyText].join(" ").toLowerCase();
  const termLower = term.toLowerCase().trim();
  const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "g");
  const count = (fullText.match(regex) || []).length;

  // Check if word was found in spreadsheet headline but not in online article
  const headlineLower = headline.toLowerCase();
  const foundInSpreadsheetHeadline =
    term.trim().length > 0 &&
    headlineLower.includes(termLower) &&
    count === 0;

  // Build display paragraphs from the same bodyText (same extraction = same content)
  const paragraphs = toParagraphs(bodyText);

  return NextResponse.json({
    title:      highlightRaw(title, term),
    subtitle:   highlightRaw(subtitle, term),
    paragraphs: paragraphs.map((p) => highlightRaw(p, term)),
    count,
    sourceUrl: url,
    foundInSpreadsheetHeadline,
    spreadsheetHeadline: foundInSpreadsheetHeadline ? highlightRaw(headline, term) : "",
  });
}
