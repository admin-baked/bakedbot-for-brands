'use client';

import { useState } from 'react';
import { Settings2, CalendarPlus, DollarSign, Package, BarChart } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart as RechartsBarChart,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { AnalyticsData } from '../actions';
import type { AnalyticsPrefs } from '@/server/actions/analytics-prefs';
import { WidgetCustomizer } from './widget-customizer';
import { CreateReportDialog } from './create-report-dialog';

// ---------------------------------------------------------------------------
// Widget registry
// ---------------------------------------------------------------------------

export const OVERVIEW_WIDGETS = [
  {
    id: 'revenue_kpis',
    label: 'Revenue KPIs',
    description: 'Total Revenue, Orders, AOV, Repeat Rate',
  },
  {
    id: 'revenue_chart',
    label: 'Revenue Over Time',
    description: 'Daily GMV for the last 30 days',
  },
  {
    id: 'sales_by_category',
    label: 'Sales by Category',
    description: 'Revenue distribution by product category',
  },
  {
    id: 'top_products',
    label: 'Top Products',
    description: 'Top 10 products by revenue',
  },
  {
    id: 'affinity_pairs',
    label: 'Frequently Bought Together',
    description: 'Product co-purchase correlations',
  },
  {
    id: 'cohort_heatmap',
    label: 'Customer Retention Heatmap',
    description: 'Month-over-month cohort retention',
  },
  {
    id: 'conversion_funnel',
    label: 'Conversion Funnel',
    description: 'Sessions to paid orders',
  },
  {
    id: 'channel_performance',
    label: 'Channel Performance',
    description: 'Traffic source breakdown',
  },
] as const;

export type WidgetId = (typeof OVERVIEW_WIDGETS)[number]['id'];

const PIE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];

// ---------------------------------------------------------------------------
// ScheduleButton — ghost icon per-widget
// ---------------------------------------------------------------------------

function ScheduleButton({
  widgetId,
  widgetLabel,
  orgId,
}: {
  widgetId: WidgetId;
  widgetLabel: string;
  orgId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-primary"
        title="Create scheduled report"
        onClick={() => setOpen(true)}
      >
        <CalendarPlus className="h-3.5 w-3.5" />
      </Button>
      <CreateReportDialog
        open={open}
        onClose={() => setOpen(false)}
        orgId={orgId}
        sourceWidget={widgetId}
        sourceName={widgetLabel}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// OverviewTab
// ---------------------------------------------------------------------------

interface OverviewTabProps {
  data: AnalyticsData;
  prefs: AnalyticsPrefs;
  orgId: string;
}

export default function OverviewTab({ data, prefs, orgId }: OverviewTabProps) {
  const [enabledWidgets, setEnabledWidgets] = useState<Set<string>>(
    new Set(prefs.enabledWidgets.length > 0 ? prefs.enabledWidgets : OVERVIEW_WIDGETS.map((w) => w.id))
  );
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const isEnabled = (id: string) => enabledWidgets.has(id);

  const productChartConfig = data.salesByProduct.reduce(
    (acc, item) => {
      acc[item.productName] = { label: item.productName };
      return acc;
    },
    {} as Record<string, { label: string }>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Overview</h2>
        <Button variant="outline" size="sm" onClick={() => setCustomizerOpen(true)}>
          <Settings2 className="h-4 w-4 mr-2" />
          Customize
        </Button>
      </div>

      {/* Widget: revenue_kpis */}
      {isEnabled('revenue_kpis') && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <div className="flex items-center gap-1">
                <ScheduleButton widgetId="revenue_kpis" widgetLabel="Revenue KPIs" orgId={orgId} />
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${data.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">From all non-cancelled orders.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalOrders.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Number of non-cancelled orders.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${data.averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Average revenue per order.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repeat Customer Rate</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(data.repeatCustomerRate * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Customers with &gt; 1 order.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Widget: revenue_chart */}
      {isEnabled('revenue_chart') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue Over Time</CardTitle>
              <CardDescription>Daily GMV for the last 30 days.</CardDescription>
            </div>
            <ScheduleButton widgetId="revenue_chart" widgetLabel="Revenue Over Time" orgId={orgId} />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ChartContainer
                config={{ gmv: { label: 'Revenue', color: 'hsl(var(--primary))' } }}
                className="h-full w-full"
              >
                <RechartsBarChart data={data.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    }
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${value}`}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    }
                  />
                  <Bar dataKey="gmv" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Widget: top_products */}
        {isEnabled('top_products') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Top Selling Products
                </CardTitle>
                <CardDescription>Top 10 products by revenue.</CardDescription>
              </div>
              <ScheduleButton widgetId="top_products" widgetLabel="Top Products" orgId={orgId} />
            </CardHeader>
            <CardContent>
              <ChartContainer config={productChartConfig} className="h-[300px] w-full">
                <RechartsBarChart
                  accessibilityLayer
                  data={data.salesByProduct}
                  layout="vertical"
                  margin={{ left: 0 }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="productName"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 20) + (value.length > 20 ? '...' : '')}
                    className="text-xs"
                    width={100}
                  />
                  <XAxis dataKey="revenue" type="number" hide />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => `$${Number(value).toLocaleString()}`}
                        indicator="dot"
                      />
                    }
                  />
                  <Bar dataKey="revenue" layout="vertical" fill="var(--color-chart-1)" radius={4} />
                </RechartsBarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Widget: affinity_pairs */}
        {isEnabled('affinity_pairs') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Frequently Bought Together</CardTitle>
                <CardDescription>Top product correlations.</CardDescription>
              </div>
              <ScheduleButton widgetId="affinity_pairs" widgetLabel="Frequently Bought Together" orgId={orgId} />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.affinityPairs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Need more order data for correlations.
                  </p>
                ) : (
                  data.affinityPairs.map((pair, i) => (
                    <div key={i} className="flex items-center justify-between border-b last:border-0 pb-2">
                      <div className="text-sm">
                        <div className="font-medium text-foreground">{pair.productA}</div>
                        <div className="text-muted-foreground text-xs">+ {pair.productB}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{pair.count}x</div>
                        <div className="text-xs text-muted-foreground">
                          in {Math.round(pair.strength * 100)}% of orders
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Widget: sales_by_category */}
        {isEnabled('sales_by_category') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>Revenue distribution.</CardDescription>
              </div>
              <ScheduleButton widgetId="sales_by_category" widgetLabel="Sales by Category" orgId={orgId} />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ChartContainer config={{ revenue: { label: 'Revenue' } }} className="h-full w-full">
                  <PieChart>
                    <Pie
                      data={data.salesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="revenue"
                      nameKey="category"
                    >
                      {data.salesByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => `$${Number(value).toLocaleString()}`}
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {data.salesByCategory.slice(0, 6).map((item, i) => (
                    <div key={item.category} className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="truncate" title={item.category}>
                        {item.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Widget: conversion_funnel */}
        {isEnabled('conversion_funnel') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>Sessions to Paid Orders.</CardDescription>
              </div>
              <ScheduleButton widgetId="conversion_funnel" widgetLabel="Conversion Funnel" orgId={orgId} />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ChartContainer
                  config={{ count: { label: 'Count', color: 'hsl(var(--primary))' } }}
                  className="h-full w-full"
                >
                  <RechartsBarChart data={data.conversionFunnel} layout="vertical">
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="stage"
                      type="category"
                      width={120}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={40} />
                  </RechartsBarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Widget: cohort_heatmap */}
      {isEnabled('cohort_heatmap') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Customer Retention Heatmap (Cohorts)</CardTitle>
              <CardDescription>Percentage of customers returning in subsequent months.</CardDescription>
            </div>
            <ScheduleButton widgetId="cohort_heatmap" widgetLabel="Customer Retention Heatmap" orgId={orgId} />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {data.cohorts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Not enough data for cohort analysis.
                </div>
              ) : (
                <table className="min-w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-medium text-muted-foreground">Month</th>
                      <th className="p-2 text-left font-medium text-muted-foreground">Users</th>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <th key={i} className="p-2 font-medium text-muted-foreground">
                          M{i}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.cohorts.map((cohort) => (
                      <tr key={cohort.month} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-2 font-medium">{cohort.month}</td>
                        <td className="p-2">{cohort.initialSize}</td>
                        {cohort.retention.map((pct, i) => {
                          let bg = 'bg-transparent';
                          if (pct >= 80) bg = 'bg-primary/90 text-primary-foreground';
                          else if (pct >= 60) bg = 'bg-primary/70 text-white';
                          else if (pct >= 40) bg = 'bg-primary/50 text-white';
                          else if (pct >= 20) bg = 'bg-primary/30';
                          else if (pct > 0) bg = 'bg-primary/10';
                          return (
                            <td key={i} className="p-1">
                              {pct > 0 ? (
                                <div
                                  className={`w-full h-8 flex items-center justify-center rounded ${bg}`}
                                >
                                  {i === 0 ? '100%' : `${Math.round(pct)}%`}
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground/20">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widget: channel_performance */}
      {isEnabled('channel_performance') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Channel Performance</CardTitle>
              <CardDescription>Where your traffic is coming from.</CardDescription>
            </div>
            <ScheduleButton widgetId="channel_performance" widgetLabel="Channel Performance" orgId={orgId} />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.channelPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No channel data available yet.
                </p>
              ) : (
                data.channelPerformance.map((channel) => (
                  <div
                    key={channel.channel}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium capitalize">{channel.channel}</p>
                      <p className="text-xs text-muted-foreground">{channel.sessions} sessions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{(channel.conversionRate * 100).toFixed(1)}% Conv.</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {enabledWidgets.size === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground text-sm">All widgets are hidden.</p>
            <Button variant="outline" onClick={() => setCustomizerOpen(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Customize Overview
            </Button>
          </CardContent>
        </Card>
      )}

      <WidgetCustomizer
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        enabled={enabledWidgets}
        onChange={setEnabledWidgets}
      />
    </div>
  );
}
