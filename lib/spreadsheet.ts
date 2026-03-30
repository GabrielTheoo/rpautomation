import * as XLSX from "xlsx";
import type { CleanedRow, TierEntry } from "./types";

const REQUIRED_COLUMNS = ["Date", "Headline", "URL", "Source", "Country", "Reach", "AVE", "Sentiment"];

export function parseSpreadsheet(buffer: ArrayBuffer): CleanedRow[] {
  const workbook = XLSX.read(buffer, { type: "array", codepage: 65001 });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  if (rawRows.length === 0) return [];

  const firstRow = rawRows[0];
  const headerMap: Record<string, string> = {};
  Object.keys(firstRow).forEach((key) => {
    const normalized = key.trim();
    const match = REQUIRED_COLUMNS.find((col) => col.toLowerCase() === normalized.toLowerCase());
    if (match) headerMap[key] = match;
  });

  return rawRows.map((row) => {
    const cleaned: Partial<CleanedRow> = {};
    REQUIRED_COLUMNS.forEach((col) => {
      const originalKey = Object.keys(headerMap).find((k) => headerMap[k] === col);
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
  return "N/A";
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
