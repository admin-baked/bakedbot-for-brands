/**
 * Shared analytics constants — safe to import from both client and server.
 * Do NOT add 'use server' or 'use client' here.
 */

export const DEFAULT_WIDGETS = [
  'revenue_kpis',
  'revenue_chart',
  'sales_by_category',
  'top_products',
  'affinity_pairs',
  'cohort_heatmap',
  'conversion_funnel',
  'channel_performance',
] as const;

export type WidgetId = (typeof DEFAULT_WIDGETS)[number];
