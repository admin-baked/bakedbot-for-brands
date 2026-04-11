export type MartyScoreboardMetricFormat = 'currency' | 'integer' | 'percent' | 'days';

export interface MartyScoreboardMetric {
  id: string;
  label: string;
  value: number | null;
  format: MartyScoreboardMetricFormat;
  note?: string;
}

export type MartyScoreboardGroupId =
  | 'revenue'
  | 'pipeline'
  | 'activation'
  | 'customer_health'
  | 'execution';

export interface MartyScoreboardGroup {
  id: MartyScoreboardGroupId;
  title: string;
  metrics: MartyScoreboardMetric[];
}

export interface MartyScoreboard {
  targetMrr: number;
  updatedAt: string;
  groups: MartyScoreboardGroup[];
}

export type MartyWeeklyMemoSectionId =
  | 'business_status'
  | 'product_status'
  | 'gtm_status'
  | 'customer_status'
  | 'decisions_needed';

export interface MartyWeeklyMemoSection {
  id: MartyWeeklyMemoSectionId;
  title: string;
  summary: string;
  bullets: string[];
}

export interface MartyWeeklyMemoData {
  date: string;
  generatedAt: string;
  targetMrr: number;
  currentMrr: number | null;
  paceVsTargetPct: number | null;
  highestValueOpportunities: string[];
  decisionsNeeded: string[];
  sections: MartyWeeklyMemoSection[];
  scoreboard: MartyScoreboard;
}
