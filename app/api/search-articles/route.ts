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
      // Fetch failed — report error, caller will fallback to headline check
      return NextResponse.json({ url, found: false, count: 0, fetchFailed: true });
    }

    const $ = cheerio.load(html);

    const pageTitle = $("title").text().toLowerCase();
    const ogTitle = $('meta[property="og:title"]').attr("content")?.toLowerCase() || "";
    const ogDesc = $('meta[property="og:description"]').attr("content")?.toLowerCase() || "";
    const metaDesc = $('meta[name="description"]').attr("content")?.toLowerCase() || "";

    $("script, style, nav, footer, header, aside").remove();
    const bodyText = $("body").text().toLowerCase();

    const fullText = [pageTitle, ogTitle, bodyText, ogDesc, metaDesc].join(" ");

    // Count occurrences (escape special regex chars)
    const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    const matches = fullText.match(regex);
    const count = matches ? matches.length : 0;

    return NextResponse.json({ url, found: count > 0, count, fetchFailed: false });
  } catch (error) {
    console.error("Search articles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
