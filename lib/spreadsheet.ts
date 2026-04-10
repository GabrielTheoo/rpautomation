import * as XLSX from "xlsx";
import type { CleanedRow, TierEntry } from "./types";

const REQUIRED_COLUMNS = [
  "Date",
  "Headline",
  "URL",
  "Source",
  "Country",
  "Reach",
  "AVE",
  "Sentiment",
];

export function parseSpreadsheet(buffer: ArrayBuffer): CleanedRow[] {
  const bytes = new Uint8Array(buffer);

  // Detect UTF-16 BOM (FF FE = LE, FE FF = BE)
  const isUtf16LE = bytes[0] === 0xff && bytes[1] === 0xfe;
  const isUtf16BE = bytes[0] === 0xfe && bytes[1] === 0xff;

  let workbook: XLSX.WorkBook;

  if (isUtf16LE || isUtf16BE) {
    const encoding = isUtf16BE ? "utf-16be" : "utf-16le";
    const text = new TextDecoder(encoding).decode(buffer);
    workbook = XLSX.read(text, { type: "string", raw: false });
  } else {
    workbook = XLSX.read(buffer, { type: "array" });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  if (rawRows.length === 0) return [];

  const firstRow = rawRows[0];
  const headerMap: Record<string, string> = {};

  Object.keys(firstRow).forEach((key) => {
    const normalized = key.trim();
    const match = REQUIRED_COLUMNS.find(
      (col) => col.toLowerCase() === normalized.toLowerCase()
    );
    if (match) headerMap[key] = match;
  });

  return rawRows.map((row) => {
    const cleaned: Partial<CleanedRow> = {};
    REQUIRED_COLUMNS.forEach((col) => {
      const originalKey = Object.keys(headerMap).find(
        (k) => headerMap[k] === col
      );
      const value = originalKey ? String(row[originalKey] ?? "") : "";
      (cleaned as Record<string, string | number>)[col] = value;
    });
    return cleaned as CleanedRow;
  });
}

export function matchTier(url: string, tierEntries: TierEntry[]): string {
  if (!url) return "";
  const urlLower = url.toLowerCase();
  for (const entry of tierEntries) {
    if (entry.keyword && urlLower.includes(entry.keyword.toLowerCase())) {
      return String(entry.tier);
    }
  }
  return "";
}

export function exportToXLSX(rows: Record<string, unknown>[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "RPAutomation");
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length)),
  }));
  worksheet["!cols"] = colWidths;
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export function exportToXLSXMultiSheet(
  groups: Record<string, Record<string, unknown>[]>
): Buffer {
  const workbook = XLSX.utils.book_new();

  for (const [country, rows] of Object.entries(groups)) {
    if (rows.length === 0) continue;
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length)),
    }));
    worksheet["!cols"] = colWidths;
    const safeName = country.slice(0, 31).replace(/[\/\\\?\*\[\]:]/g, "_");
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName || "Other");
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

// Parse a multi-sheet spreadsheet for Acurácia: each sheet = one country
export function parseMultiSheetSpreadsheet(buffer: ArrayBuffer): import("./types").ProcessedRow[] {
  const bytes = new Uint8Array(buffer);
  const isUtf16LE = bytes[0] === 0xff && bytes[1] === 0xfe;
  const isUtf16BE = bytes[0] === 0xfe && bytes[1] === 0xff;

  let workbook: XLSX.WorkBook;
  if (isUtf16LE || isUtf16BE) {
    const text = new TextDecoder(isUtf16BE ? "utf-16be" : "utf-16le").decode(buffer);
    workbook = XLSX.read(text, { type: "string", raw: false });
  } else {
    workbook = XLSX.read(buffer, { type: "array" });
  }

  // ── Value normalizers ──────────────────────────────────
  function normalizeProactive(val: string): "Proactive" | "Spontaneous" | "" {
    const v = val.trim().toLowerCase();
    if (["proativo", "pro active", "proactive", "pro-active"].includes(v)) return "Proactive";
    if (["espontâneo", "espontaneo", "espontâneos", "espontaneos", "spontaneous"].includes(v)) return "Spontaneous";
    return val as "" | "Proactive" | "Spontaneous";
  }

  function normalizeImpact(val: string): "With Impact" | "Without Impact" | "Checking..." | "Error" | "" {
    const v = val.trim().toLowerCase();
    if (["com impacto", "with impact", "comimpacto"].includes(v)) return "With Impact";
    if (["sem impacto", "without impact", "semimpacto"].includes(v)) return "Without Impact";
    return val as "" | "With Impact" | "Without Impact" | "Checking..." | "Error";
  }

  const allRows: import("./types").ProcessedRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    });

    for (const row of rawRows) {
      const get = (keys: string[]): string => {
        for (const k of keys) {
          const match = Object.keys(row).find(
            (rk) => rk.trim().toLowerCase() === k.toLowerCase()
          );
          if (match) return String(row[match] ?? "").trim();
        }
        return "";
      };

      const tier = get(["tier"]) as "1" | "2" | "3" | "N/A" | "";
      const proactive = normalizeProactive(
        get(["proactive or spontaneous", "proactive_or_spontaneous", "proativo ou espontâneo", "proativo"])
      );
      const impact = normalizeImpact(
        get(["with impact or without impact", "with_impact_or_without_impact", "com impacto ou sem impacto", "impacto"])
      );

      const countryValue = get(["country", "país", "pais"]) || sheetName.trim();

      allRows.push({
        Date:      get(["date"]),
        Headline:  get(["headline"]),
        URL:       get(["url"]),
        Source:    get(["source"]),
        Country:   countryValue,
        Reach:     get(["reach"]),
        AVE:       get(["ave"]),
        Sentiment: get(["sentiment"]),
        "Proactive or Spontaneous": proactive,
        "With Impact or Without Impact": impact,
        Tier: tier,
      });
    }
  }

  return allRows;
}

export function parseTierSpreadsheet(
  buffer: ArrayBuffer
): Array<{ name: string; keyword: string; tier: 1 | 2 | 3 }> {
  const bytes = new Uint8Array(buffer);
  const isUtf16LE = bytes[0] === 0xff && bytes[1] === 0xfe;
  const isUtf16BE = bytes[0] === 0xfe && bytes[1] === 0xff;

  let workbook: XLSX.WorkBook;
  if (isUtf16LE || isUtf16BE) {
    const text = new TextDecoder(isUtf16BE ? "utf-16be" : "utf-16le").decode(buffer);
    workbook = XLSX.read(text, { type: "string", raw: false });
  } else {
    workbook = XLSX.read(buffer, { type: "array" });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  const results: Array<{ name: string; keyword: string; tier: 1 | 2 | 3 }> = [];

  for (const row of rawRows) {
    const keys = Object.keys(row);
    const nameKey = keys.find((k) =>
      ["nome", "name", "veiculo", "veículo", "vehicle", "media"].includes(k.toLowerCase().trim())
    );
    const kwKey = keys.find((k) =>
      ["keyword", "keywords", "url", "dominio", "domínio", "domain", "chave"].includes(k.toLowerCase().trim())
    );
    const tierKey = keys.find((k) =>
      ["tier", "nivel", "nível", "level"].includes(k.toLowerCase().trim())
    );

    if (!nameKey || !kwKey || !tierKey) continue;

    const name = String(row[nameKey] || "").trim();
    const keyword = String(row[kwKey] || "").trim().toLowerCase();
    const tierRaw = parseInt(String(row[tierKey] || ""), 10);
    const tier = ([1, 2, 3].includes(tierRaw) ? tierRaw : null) as 1 | 2 | 3 | null;

    if (name && keyword && tier) {
      results.push({ name, keyword, tier });
    }
  }

  return results;
}