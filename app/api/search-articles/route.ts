import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

// Priority-ordered selectors for the article body
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

// Elements to strip before extracting text — removes sidebar, related news, comments, ads, etc.
const NOISE_SELECTORS = [
  "script",
  "style",
  "nav",
  "footer",
  "header",
  "aside",
  "[class*='related']",
  "[class*='recommend']",
  "[class*='sidebar']",
  "[class*='comentar']",
  "[class*='comment']",
  "[class*='social']",
  "[class*='share']",
  "[class*='newsletter']",
  "[class*='advertisement']",
  "[class*='banner']",
  "[class*='ads']",
  "[id*='related']",
  "[id*='sidebar']",
  "[id*='comment']",
  "[id*='ads']",
  "[id*='newsletter']",
].join(", ");

export async function POST(request: NextRequest) {
  try {
    const { url, term } = await request.json();

    if (!url || !term) {
      return NextResponse.json({ error: "Missing url or term" }, { status: 400 });
    }

    const termLower = term.toLowerCase().trim();
    let html = "";

    try {
      const response = await axios.get(url, {
        timeout: 12000,
        headers: HEADERS,
        maxRedirects: 5,
        maxContentLength: 5 * 1024 * 1024,
      });
      html = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    } catch {
      return NextResponse.json({ url, found: false, count: 0, fetchFailed: true });
    }

    const $ = cheerio.load(html);

    // Strip all noise elements
    $(NOISE_SELECTORS).remove();

    // Title: h1
    const titleText = $("h1").first().text().trim();

    // Subtitle: first h2 inside the article area, or the subtitle/deck meta
    const subtitleText =
      $("[class*='subtitle'], [class*='subheadline'], [class*='deck'], [class*='chapeu']").first().text().trim() ||
      $("h2").first().text().trim();

    // Article body: try each selector in priority order
    let bodyText = "";
    for (const selector of ARTICLE_SELECTORS) {
      const el = $(selector).first();
      if (el.length && el.text().trim().length > 100) {
        bodyText = el.text().trim();
        break;
      }
    }

    // Fallback: full body text (already stripped of nav/footer/etc.)
    if (!bodyText) {
      bodyText = $("body").text().trim();
    }

    // Only search in: title + subtitle + body. Never in meta, sidebar, related articles.
    const searchableText = [titleText, subtitleText, bodyText].join(" ").toLowerCase();

    const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    const matches = searchableText.match(regex);
    const count = matches ? matches.length : 0;

    return NextResponse.json({ url, found: count > 0, count, fetchFailed: false });
  } catch (error) {
    console.error("Search articles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
