import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

const KEYWORD = "eurofarma";
const IMPACT_THRESHOLD = 2;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    let html = "";
    let fetchError = "";

    try {
      const response = await axios.get(url, {
        timeout: 12000,
        headers: HEADERS,
        maxRedirects: 5,
        maxContentLength: 5 * 1024 * 1024,
      });
      html = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 403 || status === 401) {
          fetchError = `Acesso bloqueado pelo site (HTTP ${status}) — site com paywall ou proteção anti-bot`;
        } else if (status === 404) {
          fetchError = "Página não encontrada (404)";
        } else if (status && status >= 500) {
          fetchError = `Erro no servidor do site (HTTP ${status})`;
        } else if (err.code === "ECONNABORTED") {
          fetchError = "Tempo limite excedido — site não respondeu em 12s";
        } else if (err.code === "ENOTFOUND") {
          fetchError = "Domínio não encontrado — URL inválida ou fora do ar";
        } else {
          fetchError = `Não foi possível acessar o link (${err.code || err.message})`;
        }
      } else {
        fetchError = "Erro desconhecido ao acessar o link";
      }

      return NextResponse.json({
        url,
        impact: "Error",
        count: 0,
        inTitle: false,
        message: fetchError,
      });
    }

    const $ = cheerio.load(html);

    const pageTitle = $("title").text().toLowerCase();
    const ogTitle = $('meta[property="og:title"]').attr("content")?.toLowerCase() || "";
    const h1 = $("h1").first().text().toLowerCase();
    const h2 = $("h2").first().text().toLowerCase();
    const ogDesc = $('meta[property="og:description"]').attr("content")?.toLowerCase() || "";
    const metaDesc = $('meta[name="description"]').attr("content")?.toLowerCase() || "";

    const inTitle =
      pageTitle.includes(KEYWORD) ||
      ogTitle.includes(KEYWORD) ||
      h1.includes(KEYWORD) ||
      h2.includes(KEYWORD);

    $("script, style, nav, footer, header, aside").remove();
    const bodyText = $("body").text().toLowerCase();

    const fullText = [bodyText, ogDesc, metaDesc].join(" ");
    const regex = new RegExp(KEYWORD, "g");
    const matches = fullText.match(regex);
    const count = matches ? matches.length : 0;

    const impact =
      count >= IMPACT_THRESHOLD || inTitle ? "With Impact" : "Without Impact";

    return NextResponse.json({ url, impact, count, inTitle });
  } catch (error) {
    console.error("Check impact error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}