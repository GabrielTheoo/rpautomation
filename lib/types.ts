export interface CleanedRow {
  Date: string;
  Headline: string;
  URL: string;
  Source: string;
  Country: string;
  Reach: string | number;
  AVE: string | number;
  Sentiment: string;
}

export interface ProcessedRow extends CleanedRow {
  "Proactive or Spontaneous": "Proactive" | "Spontaneous" | "";
  "With Impact or Without Impact": "With Impact" | "Without Impact" | "Checking..." | "Error" | "";
  Tier: "1" | "2" | "3" | "N/A" | "";
}

export interface TierEntry {
  id: string;
  keyword: string;
  name: string;
  tier: 1 | 2 | 3;
}

export type WizardStep = 1 | 2 | 3 | 4;

export interface ImpactResult {
  url: string;
  impact: "With Impact" | "Without Impact" | "Error";
  count: number;
}
