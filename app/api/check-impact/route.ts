import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

const KEYWORD = "europharma";
const IMPACT_THRESHOLD = 2;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    let html = "";
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36", Accept: "text/html,application/xhtml+xml" },
        maxRedirects: 5,
      });
      html = response.data;
    } catch {
      return NextResponse.json({ url, impact: "Error", count: 0, message: "Could not fetch URL" });
    }
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header").remove();
    const text = $("body").text().toLowerCase();
    const regex = new RegExp(KEYWORD.toLowerCase(), "g");
    const matches = text.match(regex);
    const count = matches ? matches.length : 0;
    const impact = count >= IMPACT_THRESHOLD ? "With Impact" : "Without Impact";
    return NextResponse.json({ url, impact, count });
  } catch (error) {
    console.error("Check impact error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
